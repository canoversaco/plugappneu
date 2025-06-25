import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Marker Fix für leaflet in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Broadcast-Komponente (nicht als Hook, sondern regulär)
function Broadcast({ msg, show }) {
  if (!show || !msg) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        background: "#facc15",
        color: "#18181b",
        zIndex: 9999,
        fontWeight: 700,
        fontSize: 18,
        textAlign: "center",
        padding: "7px 0",
      }}
    >
      📢 {msg}
    </div>
  );
}

// Browser Notification helper
function triggerNotification(title, body) {
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") new Notification(title, { body });
      });
    }
  }
}

export default function PlugApp() {
  // --- Alle Hooks ganz oben definieren! ---

  // Views & User
  const [view, setView] = useState("login");
  const [user, setUser] = useState(null);

  // Broadcast
  const [broadcast, setBroadcast] = useState({ text: "", ts: 0 });
  const [showBroadcast, setShowBroadcast] = useState(false);

  // Daten aus Firestore
  const [produkte, setProdukte] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);

  // UI & Warenkorb
  const [warenkorb, setWarenkorb] = useState([]);
  const [error, setError] = useState("");

  // Produktfilter
  const kategorien = [
    { name: "Hase" },
    { name: "Cali", unterkategorien: ["Exotic", "OG", "Runts"] },
    { name: "Schoko", unterkategorien: ["Dunkel", "Weiß"] },
    { name: "Shem" },
  ];
  const [selectedKat, setSelectedKat] = useState(kategorien[0].name);
  const [selectedSub, setSelectedSub] = useState("");

  // Dialog States
  const [showProduktDialog, setShowProduktDialog] = useState(false);
  const [editProdukt, setEditProdukt] = useState(null);

  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editUser, setEditUser] = useState(null);

  // Chat & Notifications
  const [activeChat, setActiveChat] = useState(null);
  const lastChatRef = useRef({});
  const [chatMsg, setChatMsg] = useState("");
  const [chatNotify, setChatNotify] = useState(null);
  const [statusNotify, setStatusNotify] = useState(null);

  // Admin/Kurier Panel Tab State
  const [adminTab, setAdminTab] = useState("produkte");
  const [tempTreffpunkt, setTempTreffpunkt] = useState(null);

  // Order Checkout States
  const [orderTreffpunkt, setOrderTreffpunkt] = useState(null);
  const [orderZahlung, setOrderZahlung] = useState("bar");
  const [orderNotiz, setOrderNotiz] = useState("");

  // Login States
  const [loginName, setLoginName] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // --- Firestore Listener ---

  useEffect(() => {
    const unsubProdukte = onSnapshot(collection(db, "produkte"), (snap) => {
      setProdukte(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const unsubOrders = onSnapshot(collection(db, "orders"), (snap) => {
      setOrders(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const unsubSettings = onSnapshot(doc(db, "settings", "main"), (snap) => {
      const data = snap.data();
      if (data?.broadcast && data.ts !== broadcast.ts) {
        setBroadcast({ text: data.broadcast, ts: data.ts });
        setShowBroadcast(true);
        setTimeout(() => setShowBroadcast(false), 5000);
      }
    });

    return () => {
      unsubProdukte();
      unsubOrders();
      unsubUsers();
      unsubSettings();
    };
  }, [broadcast.ts]);

  // --- Notifications for chat/status changes ---
  useEffect(() => {
    if (!user) return;
    const myOrders = orders.filter((o) => o.kunde === user.username);
    myOrders.forEach((order) => {
      if (
        order.chat &&
        order.chat.length > 0 &&
        (!lastChatRef.current[order.id] ||
          lastChatRef.current[order.id] < order.chat.length)
      ) {
        const msgObj = order.chat[order.chat.length - 1];
        if (msgObj.user !== user.username) {
          setChatNotify({ o: order, msg: msgObj });
          triggerNotification("Neue Nachricht", msgObj.text);
        }
        lastChatRef.current[order.id] = order.chat.length;
      }

      if (
        order.status &&
        lastChatRef.current["s" + order.id] !== order.status
      ) {
        if (
          lastChatRef.current["s" + order.id] &&
          order.status !== lastChatRef.current["s" + order.id]
        ) {
          setStatusNotify({ o: order });
          triggerNotification(
            "Bestellstatus geändert",
            `Deine Bestellung ist jetzt: ${order.status}`
          );
        }
        lastChatRef.current["s" + order.id] = order.status;
      }
    });
  }, [orders, user]);

  // --- CRUD Funktionen ---
  async function produktHinzufügen(form) {
    await addDoc(collection(db, "produkte"), form);
  }
  async function produktUpdaten(id, patch) {
    const ref = doc(db, "produkte", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      setError("Produkt existiert nicht mehr!");
      return;
    }
    await updateDoc(ref, patch);
  }
  async function produktLöschen(id) {
    await deleteDoc(doc(db, "produkte", id));
  }
  async function bestellungHinzufügen(order) {
    await addDoc(collection(db, "orders"), order);
  }
  async function bestellungUpdaten(id, patch) {
    await updateDoc(doc(db, "orders", id), patch);
  }
  async function bestellungLöschen(id) {
    await deleteDoc(doc(db, "orders", id));
  }
  async function userHinzufügen(form) {
    await addDoc(collection(db, "users"), form);
  }
  async function userUpdaten(id, patch) {
    await updateDoc(doc(db, "users", id), patch);
  }
  async function userLöschen(id) {
    await deleteDoc(doc(db, "users", id));
  }
  async function sendBroadcast(text) {
    await setDoc(
      doc(db, "settings", "main"),
      { broadcast: text, ts: Date.now() },
      { merge: true }
    );
  }

  // --- Filterprodukte ---
  function filterProdukte() {
    let list = produkte.filter((p) => p.kategorie === selectedKat);
    if (selectedSub)
      list = list.filter((p) => p.unterkategorie === selectedSub);
    return list.sort((a, b) => (a.id > b.id ? 1 : -1));
  }

  // --- Login Funktion ---
  function handleLogin() {
    setError("");
    const u = users.find(
      (u) => u.username === loginName && u.password === loginPass
    );
    if (!u) {
      setError("Benutzername oder Passwort falsch!");
      return;
    }
    setUser(u);
    setView("home");
  }

  // --- Chat senden ---
  async function sendChatMsg(order, text) {
    if (!text) return;
    setChatMsg("");
    const newChat = order.chat
      ? [...order.chat, { user: user.username, text, ts: Date.now() }]
      : [{ user: user.username, text, ts: Date.now() }];
    await bestellungUpdaten(order.id, { chat: newChat });
  }

  // --- UI-Render (Views) ---

  // LOGIN VIEW
  if (view === "login") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#18181b",
          color: "#fff",
          fontFamily: "'Inter', sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <h2 style={{ fontSize: 30, fontWeight: 900, marginBottom: 22 }}>
          Plug Login
        </h2>
        <input
          style={{
            width: 240,
            borderRadius: 8,
            border: 0,
            background: "#23262e",
            color: "#fff",
            fontSize: 18,
            padding: "10px 12px",
            marginBottom: 10,
          }}
          placeholder="Benutzername"
          value={loginName}
          onChange={(e) => setLoginName(e.target.value)}
        />
        <input
          type="password"
          style={{
            width: 240,
            borderRadius: 8,
            border: 0,
            background: "#23262e",
            color: "#fff",
            fontSize: 18,
            padding: "10px 12px",
            marginBottom: 10,
          }}
          placeholder="Passwort"
          value={loginPass}
          onChange={(e) => setLoginPass(e.target.value)}
        />
        <button
          onClick={handleLogin}
          style={{
            background: "#38bdf8",
            color: "#18181b",
            border: 0,
            borderRadius: 8,
            fontWeight: 800,
            padding: "10px 30px",
            fontSize: 19,
            marginBottom: 10,
            cursor: "pointer",
          }}
        >
          ➡️ Login
        </button>
        {error && (
          <div
            style={{ color: "#f87171", fontWeight: 700, marginTop: 12 }}
            role="alert"
          >
            {error}
          </div>
        )}
      </div>
    );
  }

  // HOME VIEW
  if (view === "home" && user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#18181b",
          color: "#fff",
          fontFamily: "'Inter', sans-serif",
          padding: 30,
        }}
      >
        <Broadcast msg={broadcast.text} show={showBroadcast} />
        <h2
          style={{ fontSize: 30, fontWeight: 900, marginBottom: 22 }}
          aria-live="polite"
        >
          Plug App
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <button
            onClick={() => setView("menü")}
            style={navBtnStyle()}
            type="button"
          >
            🍃 Zum Menü
          </button>
          <button
            onClick={() => setView("meine")}
            style={navBtnStyle()}
            type="button"
          >
            📜 Meine Bestellungen
          </button>
          {user.role === "admin" && (
            <button
              onClick={() => setView("admin")}
              style={navBtnStyle()}
              type="button"
            >
              🔧 Admin Panel
            </button>
          )}
          {user.role === "kurier" && (
            <button
              onClick={() => setView("kurier")}
              style={navBtnStyle()}
              type="button"
            >
              🚚 Kurier Panel
            </button>
          )}
        </div>
        <div style={{ marginTop: 40 }}>
          <button
            onClick={() => {
              setUser(null);
              setView("login");
            }}
            style={{
              background: "#f87171",
              color: "#fff",
              border: 0,
              borderRadius: 7,
              padding: "7px 19px",
              fontWeight: 800,
              cursor: "pointer",
            }}
            type="button"
          >
            🚪 Logout
          </button>
        </div>
      </div>
    );
  }

  // MENÜ VIEW
  if (view === "menü" && user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#18181b",
          color: "#fff",
          fontFamily: "'Inter', sans-serif",
          padding: 30,
        }}
      >
        <Broadcast msg={broadcast.text} show={showBroadcast} />
        <h2
          style={{ fontSize: 26, fontWeight: 900, marginBottom: 18 }}
          aria-live="polite"
        >
          🍃 Menü
        </h2>
        {/* Kategorien */}
        <div style={{ display: "flex", gap: 13, marginBottom: 14 }}>
          {kategorien.map((kat) => (
            <button
              key={kat.name}
              style={{
                fontWeight: 700,
                fontSize: 17,
                background: selectedKat === kat.name ? "#38bdf8" : "#23262e",
                color: selectedKat === kat.name ? "#18181b" : "#fff",
                borderRadius: 8,
                border: 0,
                padding: "7px 18px",
                cursor: "pointer",
              }}
              type="button"
              onClick={() => {
                setSelectedKat(kat.name);
                setSelectedSub("");
              }}
            >
              {kat.name}
            </button>
          ))}
        </div>
        {/* Unterkategorien */}
        {kategorien.find((k) => k.name === selectedKat)?.unterkategorien && (
          <div style={{ display: "flex", gap: 9, marginBottom: 14 }}>
            {kategorien
              .find((k) => k.name === selectedKat)
              .unterkategorien.map((sub) => (
                <button
                  key={sub}
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    background: selectedSub === sub ? "#a3e635" : "#23262e",
                    color: selectedSub === sub ? "#18181b" : "#fff",
                    borderRadius: 8,
                    border: 0,
                    padding: "5px 13px",
                    cursor: "pointer",
                  }}
                  type="button"
                  onClick={() => setSelectedSub(sub)}
                >
                  {sub}
                </button>
              ))}
            <button
              style={{
                fontWeight: 600,
                fontSize: 15,
                background: selectedSub === "" ? "#a3e635" : "#23262e",
                color: selectedSub === "" ? "#18181b" : "#fff",
                borderRadius: 8,
                border: 0,
                padding: "5px 13px",
                cursor: "pointer",
              }}
              type="button"
              onClick={() => setSelectedSub("")}
            >
              Alle
            </button>
          </div>
        )}
        {/* Produktliste */}
        {filterProdukte().length === 0 ? (
          <div style={{ color: "#a1a1aa", marginBottom: 17 }}>
            Keine Produkte in dieser Kategorie.
          </div>
        ) : (
          filterProdukte().map((p) => (
            <div
              key={p.id}
              style={{
                background: "#23262e",
                borderRadius: 12,
                padding: 13,
                marginBottom: 13,
                boxShadow: "0 1px 7px #0001",
                fontSize: 17,
              }}
            >
              <b>{p.name}</b>{" "}
              <span style={{ color: "#a3e635", fontWeight: 700 }}>
                {p.preis} €/g
              </span>
              <div style={{ fontSize: 14, color: "#a1a1aa" }}>
                {p.beschreibung}
              </div>
              <div style={{ fontSize: 13, marginTop: 3 }}>
                Bestand: <b>{p.bestand ?? 0}</b>
              </div>
              <button
                style={{
                  background: "#38bdf8",
                  color: "#18181b",
                  borderRadius: 7,
                  border: 0,
                  fontWeight: 700,
                  padding: "6px 16px",
                  marginTop: 8,
                  fontSize: 16,
                  cursor: "pointer",
                }}
                type="button"
                onClick={() => {
                  if ((p.bestand ?? 0) <= 0) {
                    setError("Nicht mehr auf Lager!");
                    return;
                  }
                  setWarenkorb((prev) => {
                    const already = prev.find((w) => w.produktId === p.id);
                    if (already)
                      return prev.map((w) =>
                        w.produktId === p.id ? { ...w, menge: w.menge + 1 } : w
                      );
                    return [...prev, { produktId: p.id, menge: 1 }];
                  });
                  setError("");
                }}
              >
                ➕ In den Warenkorb
              </button>
            </div>
          ))
        )}

        {/* Warenkorb */}
        {warenkorb.length > 0 && (
          <div
            style={{
              marginTop: 24,
              background: "#27272a",
              borderRadius: 14,
              padding: 15,
              maxWidth: 410,
            }}
          >
            <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>
              🛒 Warenkorb
            </h3>
            {warenkorb.map((item) => {
              const p = produkte.find((pr) => pr.id === item.produktId);
              return (
                <div
                  key={item.produktId}
                  style={{
                    fontSize: 15,
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  {p?.name || "?"} × {item.menge} (
                  {(p?.preis * item.menge).toFixed(2)} €)
                  <button
                    style={{
                      marginLeft: 9,
                      background: "#f87171",
                      color: "#18181b",
                      border: 0,
                      borderRadius: 6,
                      padding: "2px 7px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      setWarenkorb(
                        warenkorb.filter((w) => w.produktId !== item.produktId)
                      )
                    }
                    title="Aus Warenkorb entfernen"
                    type="button"
                  >
                    🗑️
                  </button>
                </div>
              );
            })}
            <div style={{ marginTop: 11, fontWeight: 700, fontSize: 15 }}>
              Gesamt:{" "}
              {warenkorb
                .reduce((sum, item) => {
                  const p = produkte.find((pr) => pr.id === item.produktId);
                  return sum + (p?.preis || 0) * item.menge;
                }, 0)
                .toFixed(2)}{" "}
              €
            </div>
            <button
              style={{
                background: "#a3e635",
                color: "#18181b",
                fontWeight: 800,
                borderRadius: 8,
                border: 0,
                padding: "9px 22px",
                fontSize: 17,
                marginTop: 13,
                cursor: "pointer",
              }}
              type="button"
              onClick={() => setView("order")}
            >
              🚀 Zur Kasse
            </button>
          </div>
        )}
        <button
          onClick={() => setView("home")}
          style={{
            marginTop: 26,
            background: "#23262e",
            color: "#fff",
            borderRadius: 10,
            border: 0,
            padding: "10px 24px",
            fontSize: 18,
            fontWeight: 700,
            cursor: "pointer",
          }}
          type="button"
        >
          ⬅️ Zurück
        </button>
        <div
          style={{ color: "#f87171", marginTop: 13, minHeight: 25 }}
          aria-live="assertive"
        >
          {error}
        </div>
      </div>
    );
  }

  // KASSE VIEW
  if (view === "order" && user) {
    const gesamt = warenkorb.reduce((sum, item) => {
      const p = produkte.find((pr) => pr.id === item.produktId);
      return sum + (p?.preis || 0) * item.menge;
    }, 0);

    // Rabattstaffel für Krypto
    function getKryptoRabatt(betrag) {
      if (betrag > 500) return 0.05;
      if (betrag > 250) return 0.08;
      if (betrag > 100) return 0.1;
      if (betrag > 0) return 0.15;
      return 0;
    }
    const rabatt = orderZahlung === "krypto" ? getKryptoRabatt(gesamt) : 0;
    const endpreis = +(gesamt * (1 - rabatt)).toFixed(2);

    // Prüfen auf Lagerbestand
    const notEnough = warenkorb.some((item) => {
      const p = produkte.find((pr) => pr.id === item.produktId);
      return !p || p.bestand < item.menge;
    });

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#18181b",
          color: "#fff",
          fontFamily: "'Inter', sans-serif",
          padding: 30,
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 17 }}>
          🚀 Bestellung abschließen
        </h2>
        {/* Produkte im Warenkorb */}
        <div style={{ marginBottom: 13 }}>
          {warenkorb.map((item) => {
            const p = produkte.find((pr) => pr.id === item.produktId);
            return (
              <div key={item.produktId} style={{ fontSize: 15 }}>
                {p?.name || "?"} × {item.menge} (
                {(p?.preis * item.menge).toFixed(2)} €) &nbsp;
                <span style={{ color: "#a1a1aa" }}>
                  (Bestand: {p?.bestand ?? 0})
                </span>
              </div>
            );
          })}
        </div>
        {/* Zahlungsart */}
        <div style={{ marginBottom: 13 }}>
          <b>Zahlungsart:</b>{" "}
          <button
            onClick={() => setOrderZahlung("bar")}
            style={{
              background: orderZahlung === "bar" ? "#a3e635" : "#23262e",
              color: orderZahlung === "bar" ? "#18181b" : "#fff",
              border: 0,
              borderRadius: 7,
              padding: "7px 18px",
              fontWeight: 700,
              marginRight: 8,
              cursor: "pointer",
            }}
            type="button"
          >
            💶 Bar
          </button>
          <button
            onClick={() => setOrderZahlung("krypto")}
            style={{
              background: orderZahlung === "krypto" ? "#38bdf8" : "#23262e",
              color: orderZahlung === "krypto" ? "#18181b" : "#fff",
              border: 0,
              borderRadius: 7,
              padding: "7px 18px",
              fontWeight: 700,
              cursor: "pointer",
            }}
            type="button"
          >
            🪙 Krypto
          </button>
        </div>
        {/* Krypto Anleitung */}
        {orderZahlung === "krypto" && (
          <div
            style={{
              background: "#23262e",
              color: "#a3e635",
              borderRadius: 10,
              padding: 12,
              marginBottom: 10,
              fontSize: 15,
              maxWidth: 420,
            }}
          >
            <b>Krypto bezahlen = Sofortrabatt!</b>
            <div>Staffel:</div>
            <ul>
              <li>
                0–100 €: <b>15 %</b> Rabatt
              </li>
              <li>
                101–250 €: <b>10 %</b> Rabatt
              </li>
              <li>
                251–500 €: <b>8 %</b> Rabatt
              </li>
              <li>
                501–1500 €: <b>5 %</b> Rabatt
              </li>
            </ul>
            <div style={{ color: "#fff" }}>
              So einfach geht’s:
              <br />
              1. Kaufe Bitcoin, Monero, LTC oder USDT bei{" "}
              <a
                style={{ color: "#38bdf8" }}
                href="https://www.binance.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Binance
              </a>
              ,{" "}
              <a
                style={{ color: "#38bdf8" }}
                href="https://www.kraken.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Kraken
              </a>{" "}
              oder{" "}
              <a
                style={{ color: "#38bdf8" }}
                href="https://www.coinbase.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Coinbase
              </a>
              .
              <br />
              2. Transferiere auf die Zahlungsadresse (wird dir nach dem
              Abschluss angezeigt).
              <br />
              3. Sende nach Bezahlung einen Screenshot an den Plug im Chat!
              <br />
            </div>
          </div>
        )}

        {/* Treffpunkt auswählen */}
        <div style={{ marginBottom: 13 }}>
          <b>Treffpunkt auswählen:</b>
          <MapContainer
            center={orderTreffpunkt || [51.5, 7]}
            zoom={13}
            style={{ height: 150, width: "100%", marginTop: 6 }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {orderTreffpunkt && <Marker position={orderTreffpunkt} />}
            <OrderTreffpunktSelector
              value={orderTreffpunkt}
              onChange={setOrderTreffpunkt}
            />
          </MapContainer>
          {orderTreffpunkt && (
            <div style={{ marginTop: 8 }}>
              <a
                href={`https://maps.google.com/?q=${orderTreffpunkt[0]},${orderTreffpunkt[1]}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#38bdf8",
                  fontWeight: 700,
                  textDecoration: "underline",
                  fontSize: 15,
                }}
              >
                ➡️ In Google Maps öffnen
              </a>
            </div>
          )}
        </div>

        {/* Notiz */}
        <div style={{ marginBottom: 13 }}>
          <textarea
            value={orderNotiz}
            onChange={(e) => setOrderNotiz(e.target.value)}
            placeholder="Wunsch oder Notiz (optional)"
            style={{
              width: "100%",
              minHeight: 40,
              borderRadius: 8,
              border: 0,
              padding: 7,
              background: "#23262e",
              color: "#fff",
              fontSize: 16,
              resize: "vertical",
            }}
          />
        </div>

        {/* Bestellung abschließen */}
        <button
          disabled={warenkorb.length === 0 || notEnough || !orderTreffpunkt}
          onClick={async () => {
            setError("");
            if (warenkorb.length === 0) return setError("Warenkorb leer!");
            if (notEnough)
              return setError("Mindestens ein Produkt nicht auf Lager.");
            if (!orderTreffpunkt)
              return setError("Bitte Treffpunkt auswählen!");

            // Lagerbestand updaten (transaktional simuliert)
            for (const item of warenkorb) {
              const p = produkte.find((pr) => pr.id === item.produktId);
              if (!p || p.bestand < item.menge) {
                setError("Nicht genug Bestand für: " + (p?.name || "?"));
                return;
              }
            }
            for (const item of warenkorb) {
              const p = produkte.find((pr) => pr.id === item.produktId);
              await produktUpdaten(p.id, { bestand: p.bestand - item.menge });
            }

            // Bestellung speichern
            await bestellungHinzufügen({
              kunde: user.username,
              warenkorb,
              gesamt,
              rabatt,
              endpreis,
              zahlung: orderZahlung,
              notiz: orderNotiz,
              status: "offen",
              treffpunkt: orderTreffpunkt,
              ts: Date.now(),
              chat: [],
            });

            setWarenkorb([]);
            setOrderNotiz("");
            setOrderTreffpunkt(null);
            setOrderZahlung("bar");
            setView("meine");
            triggerNotification(
              "Bestellung aufgegeben",
              "Wir bearbeiten deine Order!"
            );
          }}
          style={{
            background:
              warenkorb.length === 0 || notEnough || !orderTreffpunkt
                ? "#f87171"
                : "#a3e635",
            color: "#18181b",
            fontWeight: 900,
            borderRadius: 9,
            border: 0,
            padding: "13px 33px",
            fontSize: 19,
            marginBottom: 15,
            cursor:
              warenkorb.length === 0 || notEnough || !orderTreffpunkt
                ? "not-allowed"
                : "pointer",
          }}
          type="button"
        >
          ✅ Bestellung abschließen
        </button>

        <button
          onClick={() => setView("menü")}
          style={{
            marginLeft: 15,
            background: "#23262e",
            color: "#fff",
            borderRadius: 8,
            border: 0,
            padding: "10px 22px",
            fontSize: 17,
            fontWeight: 700,
            cursor: "pointer",
          }}
          type="button"
        >
          ⬅️ Zurück
        </button>

        <div
          style={{ color: "#f87171", marginTop: 13, minHeight: 25 }}
          aria-live="assertive"
        >
          {error}
        </div>
      </div>
    );
  }

  // MEINE BESTELLUNGEN VIEW (Kunde + Kurier)
  if (view === "meine" && user) {
    // Kurier sieht alle offenen/fertigen Bestellungen, Kunde nur eigene
    const meineOrders =
      user.role === "kurier"
        ? orders.filter((o) => o.status !== "fertig")
        : orders.filter((o) => o.kunde === user.username);

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#18181b",
          color: "#fff",
          fontFamily: "'Inter', sans-serif",
          padding: 30,
        }}
      >
        <Broadcast msg={broadcast.text} show={showBroadcast} />
        <h2 style={{ fontSize: 23, fontWeight: 900, marginBottom: 15 }}>
          📜 Bestellungen
        </h2>

        {meineOrders.length === 0 ? (
          <div style={{ color: "#a1a1aa" }}>Noch keine Bestellungen.</div>
        ) : (
          meineOrders.map((order) => (
            <div
              key={order.id}
              style={{
                background: "#23262e",
                borderRadius: 13,
                padding: 12,
                marginBottom: 14,
                boxShadow: "0 1px 7px #0001",
              }}
            >
              <div>
                <b>Status:</b>{" "}
                <span style={{ color: "#facc15", fontWeight: 700 }}>
                  {order.status}
                </span>{" "}
                <span style={{ color: "#a1a1aa" }}>
                  ({new Date(order.ts).toLocaleString()})
                </span>
              </div>
              <div>
                <b>Produkte:</b>
                <ul
                  style={{
                    margin: "2px 0 2px 0",
                    paddingLeft: 16,
                    fontSize: 15,
                  }}
                >
                  {order.warenkorb.map((item, idx) => {
                    const produkt = produkte.find(
                      (p) => p.id === item.produktId
                    );
                    return (
                      <li key={idx}>
                        {produkt?.name || "?"} × {item.menge}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div>
                Zahlungsart: {order.zahlung === "krypto" ? "Krypto" : "Bar"}
                {order.zahlung === "krypto" && (
                  <span style={{ color: "#22d3ee", marginLeft: 8 }}>
                    Rabatt: -{Math.round(order.rabatt * 100)}% →{" "}
                    <b style={{ color: "#a3e635" }}>
                      {order.endpreis.toFixed(2)} €
                    </b>
                  </span>
                )}
              </div>

              {/* Treffpunkt auf Karte */}
              {order.treffpunkt && (
                <div style={{ margin: "13px 0" }}>
                  <b>Treffpunkt:</b>
                  <MapContainer
                    center={order.treffpunkt}
                    zoom={13}
                    style={{ height: 120, width: "100%", marginTop: 6 }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={order.treffpunkt} />
                  </MapContainer>
                  <a
                    href={`https://maps.google.com/?q=${order.treffpunkt[0]},${order.treffpunkt[1]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: 7,
                      color: "#38bdf8",
                      fontWeight: 700,
                      textDecoration: "underline",
                      fontSize: 15,
                    }}
                  >
                    ➡️ In Google Maps öffnen
                  </a>
                </div>
              )}

              {/* Chat */}
              <div style={{ marginTop: 12 }}>
                <b>Chat mit Plug:</b>
                <div
                  style={{
                    background: "#1e293b",
                    borderRadius: 8,
                    minHeight: 38,
                    padding: 7,
                    maxHeight: 140,
                    overflowY: "auto",
                  }}
                >
                  {order.chat?.length === 0 ? (
                    <div style={{ color: "#a1a1aa" }}>
                      Noch keine Nachrichten.
                    </div>
                  ) : (
                    order.chat.map((msg, i) => (
                      <div
                        key={i}
                        style={{
                          color:
                            msg.user === user.username ? "#a3e635" : "#38bdf8",
                          fontWeight: msg.user === user.username ? 700 : 600,
                          marginBottom: 3,
                        }}
                      >
                        {msg.user === user.username ? "Du" : "Plug"}: {msg.text}
                      </div>
                    ))
                  )}
                </div>
                <div style={{ display: "flex", marginTop: 7, gap: 7 }}>
                  <input
                    value={activeChat === order.id ? chatMsg : ""}
                    onFocus={() => setActiveChat(order.id)}
                    onChange={(e) => setChatMsg(e.target.value)}
                    placeholder="Nachricht..."
                    style={{
                      flex: 1,
                      borderRadius: 7,
                      border: 0,
                      background: "#23262e",
                      color: "#fff",
                      fontSize: 15,
                      padding: 7,
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && chatMsg.trim().length > 0) {
                        sendChatMsg(order, chatMsg.trim());
                      }
                    }}
                    type="text"
                  />
                  <button
                    onClick={() => sendChatMsg(order, chatMsg.trim())}
                    disabled={!chatMsg.trim()}
                    style={{
                      background: "#38bdf8",
                      color: "#18181b",
                      border: 0,
                      borderRadius: 7,
                      fontWeight: 700,
                      fontSize: 15,
                      padding: "6px 13px",
                      cursor: chatMsg.trim() ? "pointer" : "not-allowed",
                    }}
                    type="button"
                  >
                    📩
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        <button
          onClick={() => setView("home")}
          style={{
            background: "#23262e",
            color: "#fff",
            padding: "10px 22px",
            borderRadius: 10,
            border: 0,
            fontSize: 17,
            fontWeight: 700,
            marginTop: 16,
            cursor: "pointer",
          }}
          type="button"
        >
          ⬅️ Zurück
        </button>

        {/* Benachrichtigungen */}
        {chatNotify && (
          <div
            style={{
              position: "fixed",
              bottom: 25,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#38bdf8",
              color: "#18181b",
              fontWeight: 700,
              borderRadius: 8,
              padding: "13px 23px",
              zIndex: 2222,
            }}
          >
            📬 Neue Nachricht vom Plug: {chatNotify.msg.text}
            <button
              onClick={() => setChatNotify(null)}
              style={{
                marginLeft: 15,
                background: "#fff",
                color: "#18181b",
                fontWeight: 800,
                border: 0,
                borderRadius: 6,
                padding: "3px 11px",
                cursor: "pointer",
              }}
              type="button"
            >
              OK
            </button>
          </div>
        )}
        {statusNotify && (
          <div
            style={{
              position: "fixed",
              bottom: 75,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#a3e635",
              color: "#18181b",
              fontWeight: 700,
              borderRadius: 8,
              padding: "13px 23px",
              zIndex: 2222,
            }}
          >
            🛎️ Bestellstatus: {statusNotify.o.status}
            <button
              onClick={() => setStatusNotify(null)}
              style={{
                marginLeft: 15,
                background: "#fff",
                color: "#18181b",
                fontWeight: 800,
                border: 0,
                borderRadius: 6,
                padding: "3px 11px",
                cursor: "pointer",
              }}
              type="button"
            >
              OK
            </button>
          </div>
        )}
      </div>
    );
  }

  // ADMIN PANEL
  if (view === "admin" && user?.role === "admin") {
    // Produkt Tab
    const produkteTab = (
      <div>
        <h3 style={{ fontSize: 21, fontWeight: 800, marginBottom: 10 }}>
          🧪 Produkte
        </h3>
        <button
          onClick={() => {
            setShowProduktDialog(true);
            setEditProdukt(null);
          }}
          style={{
            background: "#38bdf8",
            color: "#18181b",
            fontWeight: 700,
            borderRadius: 7,
            padding: "7px 15px",
            border: 0,
            marginBottom: 10,
            cursor: "pointer",
          }}
          type="button"
        >
          ➕ Neues Produkt
        </button>
        {produkte
          .sort((a, b) => (a.id > b.id ? 1 : -1))
          .map((p) => (
            <div
              key={p.id}
              style={{
                background: "#23262e",
                borderRadius: 9,
                padding: 11,
                marginBottom: 8,
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ flex: 1 }}>
                <b>{p.name}</b> – {p.preis} €/g
                <br />
                <span style={{ fontSize: 13, color: "#a3e635" }}>
                  Bestand: {p.bestand ?? 0}
                </span>
                <br />
                <span style={{ fontSize: 13, color: "#38bdf8" }}>
                  {p.kategorie}
                  {p.unterkategorie ? " / " + p.unterkategorie : ""}
                </span>
              </div>
              <button
                onClick={() => {
                  setEditProdukt(p);
                  setShowProduktDialog(true);
                }}
                style={{
                  background: "#a3e635",
                  color: "#18181b",
                  border: 0,
                  borderRadius: 6,
                  fontWeight: 700,
                  padding: "4px 13px",
                  cursor: "pointer",
                }}
                type="button"
              >
                ✏️
              </button>
              <button
                onClick={() => produktLöschen(p.id)}
                style={{
                  background: "#f87171",
                  color: "#18181b",
                  border: 0,
                  borderRadius: 6,
                  fontWeight: 800,
                  padding: "4px 11px",
                  cursor: "pointer",
                }}
                type="button"
              >
                🗑️
              </button>
            </div>
          ))}
        {/* Produkt Dialog */}
        {showProduktDialog && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "#000a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: "#23262e",
                color: "#fff",
                borderRadius: 13,
                padding: 20,
                minWidth: 330,
              }}
            >
              <h4 style={{ fontSize: 19, fontWeight: 700, marginBottom: 9 }}>
                {editProdukt ? "Produkt bearbeiten" : "Neues Produkt"}
              </h4>
              <input
                id="pname"
                placeholder="Name"
                defaultValue={editProdukt?.name || ""}
                autoFocus
                style={{
                  width: "100%",
                  marginBottom: 8,
                  padding: 7,
                  borderRadius: 7,
                  border: 0,
                  background: "#18181b",
                  color: "#fff",
                }}
              />
              <input
                id="ppreis"
                type="number"
                placeholder="Preis (€ pro g)"
                defaultValue={editProdukt?.preis || ""}
                style={{
                  width: "100%",
                  marginBottom: 8,
                  padding: 7,
                  borderRadius: 7,
                  border: 0,
                  background: "#18181b",
                  color: "#fff",
                }}
              />
              <input
                id="pbestand"
                type="number"
                placeholder="Bestand"
                defaultValue={editProdukt?.bestand ?? ""}
                style={{
                  width: "100%",
                  marginBottom: 8,
                  padding: 7,
                  borderRadius: 7,
                  border: 0,
                  background: "#18181b",
                  color: "#fff",
                }}
              />
              <input
                id="pbeschr"
                placeholder="Beschreibung"
                defaultValue={editProdukt?.beschreibung || ""}
                style={{
                  width: "100%",
                  marginBottom: 8,
                  padding: 7,
                  borderRadius: 7,
                  border: 0,
                  background: "#18181b",
                  color: "#fff",
                }}
              />
              <select
                id="pkat"
                defaultValue={editProdukt?.kategorie || kategorien[0].name}
                style={{
                  width: "100%",
                  marginBottom: 8,
                  padding: 7,
                  borderRadius: 7,
                  border: 0,
                  background: "#18181b",
                  color: "#fff",
                }}
              >
                {kategorien.map((k) => (
                  <option key={k.name}>{k.name}</option>
                ))}
              </select>
              {(document.getElementById("pkat")?.value ||
                editProdukt?.kategorie) &&
                ["Cali", "Schoko"].includes(
                  document.getElementById("pkat")?.value ||
                    editProdukt?.kategorie
                ) && (
                  <select
                    id="psub"
                    defaultValue={editProdukt?.unterkategorie || ""}
                    style={{
                      width: "100%",
                      marginBottom: 8,
                      padding: 7,
                      borderRadius: 7,
                      border: 0,
                      background: "#18181b",
                      color: "#fff",
                    }}
                  >
                    {kategorien
                      .find(
                        (k) =>
                          k.name ===
                          (document.getElementById("pkat")?.value ||
                            editProdukt?.kategorie)
                      )
                      ?.unterkategorien?.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    <option value="">-</option>
                  </select>
                )}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={async () => {
                    const form = {
                      name: document.getElementById("pname").value,
                      preis: +document.getElementById("ppreis").value,
                      bestand: +document.getElementById("pbestand").value,
                      beschreibung: document.getElementById("pbeschr").value,
                      kategorie: document.getElementById("pkat").value,
                      unterkategorie:
                        document.getElementById("psub")?.value || "",
                    };
                    if (editProdukt) await produktUpdaten(editProdukt.id, form);
                    else await produktHinzufügen(form);
                    setShowProduktDialog(false);
                    setEditProdukt(null);
                  }}
                  style={{
                    background: "#a3e635",
                    color: "#18181b",
                    fontWeight: 800,
                    borderRadius: 8,
                    border: 0,
                    padding: "8px 22px",
                    fontSize: 16,
                    cursor: "pointer",
                  }}
                  type="button"
                >
                  💾 Speichern
                </button>
                <button
                  onClick={() => {
                    setShowProduktDialog(false);
                    setEditProdukt(null);
                  }}
                  style={{
                    background: "#23262e",
                    color: "#fff",
                    borderRadius: 8,
                    border: 0,
                    padding: "8px 17px",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                  type="button"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );

    // User Tab
    const usersTab = (
      <div>
        <h3 style={{ fontSize: 21, fontWeight: 800, marginBottom: 10 }}>
          👤 Userverwaltung
        </h3>
        <button
          onClick={() => {
            setShowUserDialog(true);
            setEditUser(null);
          }}
          style={{
            background: "#38bdf8",
            color: "#18181b",
            fontWeight: 700,
            borderRadius: 7,
            padding: "7px 15px",
            border: 0,
            marginBottom: 10,
            cursor: "pointer",
          }}
          type="button"
        >
          ➕ User
        </button>
        {users.map((u) => (
          <div
            key={u.id}
            style={{
              background: "#23262e",
              borderRadius: 9,
              padding: 11,
              marginBottom: 8,
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ flex: 1 }}>
              <b>{u.username}</b> – {u.role}
            </div>
            <button
              onClick={() => {
                setEditUser(u);
                setShowUserDialog(true);
              }}
              style={{
                background: "#a3e635",
                color: "#18181b",
                border: 0,
                borderRadius: 6,
                fontWeight: 700,
                padding: "4px 13px",
                cursor: "pointer",
              }}
              type="button"
            >
              ✏️
            </button>
            <button
              onClick={() => userLöschen(u.id)}
              style={{
                background: "#f87171",
                color: "#18181b",
                border: 0,
                borderRadius: 6,
                fontWeight: 800,
                padding: "4px 11px",
                cursor: "pointer",
              }}
              type="button"
            >
              🗑️
            </button>
          </div>
        ))}
        {/* User Dialog */}
        {showUserDialog && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "#000a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: "#23262e",
                color: "#fff",
                borderRadius: 13,
                padding: 20,
                minWidth: 330,
              }}
            >
              <h4 style={{ fontSize: 19, fontWeight: 700, marginBottom: 9 }}>
                {editUser ? "User bearbeiten" : "Neuer User"}
              </h4>
              <input
                id="uname"
                placeholder="Username"
                defaultValue={editUser?.username || ""}
                autoFocus
                style={{
                  width: "100%",
                  marginBottom: 8,
                  padding: 7,
                  borderRadius: 7,
                  border: 0,
                  background: "#18181b",
                  color: "#fff",
                }}
              />
              <input
                id="upass"
                placeholder="Passwort"
                defaultValue={editUser?.password || ""}
                style={{
                  width: "100%",
                  marginBottom: 8,
                  padding: 7,
                  borderRadius: 7,
                  border: 0,
                  background: "#18181b",
                  color: "#fff",
                }}
              />
              <select
                id="urole"
                defaultValue={editUser?.role || "kunde"}
                style={{
                  width: "100%",
                  marginBottom: 8,
                  padding: 7,
                  borderRadius: 7,
                  border: 0,
                  background: "#18181b",
                  color: "#fff",
                }}
              >
                <option value="kunde">Kunde</option>
                <option value="kurier">Kurier/Plug</option>
                <option value="admin">Admin</option>
              </select>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={async () => {
                    const form = {
                      username: document.getElementById("uname").value,
                      password: document.getElementById("upass").value,
                      role: document.getElementById("urole").value,
                    };
                    if (editUser) await userUpdaten(editUser.id, form);
                    else await userHinzufügen(form);
                    setShowUserDialog(false);
                    setEditUser(null);
                  }}
                  style={{
                    background: "#a3e635",
                    color: "#18181b",
                    fontWeight: 800,
                    borderRadius: 8,
                    border: 0,
                    padding: "8px 22px",
                    fontSize: 16,
                    cursor: "pointer",
                  }}
                  type="button"
                >
                  💾 Speichern
                </button>
                <button
                  onClick={() => {
                    setShowUserDialog(false);
                    setEditUser(null);
                  }}
                  style={{
                    background: "#23262e",
                    color: "#fff",
                    borderRadius: 8,
                    border: 0,
                    padding: "8px 17px",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                  type="button"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );

    // Bestellungen Tab
    const bestellungenTab = (
      <div>
        <h3 style={{ fontSize: 21, fontWeight: 800, marginBottom: 10 }}>
          📦 Bestellungen
        </h3>
        {orders.length === 0 ? (
          <div style={{ color: "#a1a1aa" }}>Keine Bestellungen vorhanden.</div>
        ) : (
          orders
            .sort((a, b) => b.ts - a.ts)
            .map((order) => (
              <div
                key={order.id}
                style={{
                  background: "#23262e",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 14,
                }}
              >
                <div style={{ marginBottom: 6 }}>
                  <b>Kunde:</b> {order.kunde}
                </div>
                <div style={{ marginBottom: 6 }}>
                  <b>Status:</b>{" "}
                  <span style={{ color: "#facc15", fontWeight: 700 }}>
                    {order.status}
                  </span>
                </div>
                <div style={{ marginBottom: 6 }}>
                  <b>Produkte:</b>{" "}
                  {order.warenkorb
                    .map((item) => {
                      const p = produkte.find((pr) => pr.id === item.produktId);
                      return p ? `${p.name} × ${item.menge}` : "?";
                    })
                    .join(", ")}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <b>Treffpunkt:</b>
                  {order.treffpunkt ? (
                    <MapContainer
                      center={order.treffpunkt}
                      zoom={13}
                      style={{ height: 100, width: "100%", marginTop: 6 }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={order.treffpunkt} />
                    </MapContainer>
                  ) : (
                    <div>Kein Treffpunkt gesetzt.</div>
                  )}
                </div>
                <div>
                  <b>Chat:</b>
                  <div
                    style={{
                      background: "#1e293b",
                      borderRadius: 8,
                      maxHeight: 130,
                      overflowY: "auto",
                      padding: 8,
                      marginTop: 4,
                      fontSize: 14,
                    }}
                  >
                    {order.chat?.length === 0 ? (
                      <div style={{ color: "#a1a1aa" }}>Keine Nachrichten.</div>
                    ) : (
                      order.chat.map((msg, idx) => (
                        <div key={idx}>
                          <b>{msg.user}</b>: {msg.text}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div style={{ marginTop: 9, display: "flex", gap: 6 }}>
                  <select
                    value={order.status}
                    onChange={async (e) =>
                      await bestellungUpdaten(order.id, {
                        status: e.target.value,
                      })
                    }
                    style={{
                      padding: 6,
                      borderRadius: 7,
                      border: 0,
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <option value="offen">offen</option>
                    <option value="in Bearbeitung">in Bearbeitung</option>
                    <option value="fertig">fertig</option>
                    <option value="storniert">storniert</option>
                  </select>
                  <button
                    onClick={async () => {
                      if (
                        window.confirm(
                          "Bestellung löschen? Dies entfernt auch den Chat dauerhaft."
                        )
                      ) {
                        await bestellungLöschen(order.id);
                      }
                    }}
                    style={{
                      background: "#f87171",
                      color: "#18181b",
                      fontWeight: 700,
                      borderRadius: 7,
                      border: 0,
                      padding: "6px 13px",
                      cursor: "pointer",
                    }}
                    type="button"
                  >
                    🗑️ Löschen
                  </button>
                </div>
              </div>
            ))
        )}
      </div>
    );

    // Settings Tab (optional)
    const settingsTab = (
      <div>
        <h3 style={{ fontSize: 21, fontWeight: 800, marginBottom: 10 }}>
          ⚙️ Einstellungen
        </h3>
        <button
          onClick={async () => {
            const text = prompt("Neue Broadcast-Nachricht (leer = aus):");
            if (text !== null) await sendBroadcast(text);
          }}
          style={{
            background: "#38bdf8",
            color: "#18181b",
            fontWeight: 700,
            borderRadius: 7,
            padding: "7px 15px",
            border: 0,
            cursor: "pointer",
          }}
          type="button"
        >
          🔊 Broadcast senden
        </button>
      </div>
    );

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#18181b",
          color: "#fff",
          fontFamily: "'Inter', sans-serif",
          padding: 30,
        }}
      >
        <Broadcast msg={broadcast.text} show={showBroadcast} />
        <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 25 }}>
          Admin Panel
        </h2>
        <nav
          style={{
            display: "flex",
            gap: 15,
            marginBottom: 25,
          }}
        >
          <button
            onClick={() => setAdminTab("produkte")}
            style={tabBtnStyle(adminTab === "produkte")}
            type="button"
          >
            Produkte
          </button>
          <button
            onClick={() => setAdminTab("bestellungen")}
            style={tabBtnStyle(adminTab === "bestellungen")}
            type="button"
          >
            Bestellungen
          </button>
          <button
            onClick={() => setAdminTab("users")}
            style={tabBtnStyle(adminTab === "users")}
            type="button"
          >
            User
          </button>
          <button
            onClick={() => setAdminTab("settings")}
            style={tabBtnStyle(adminTab === "settings")}
            type="button"
          >
            Einstellungen
          </button>
          <button
            onClick={() => {
              setUser(null);
              setView("login");
            }}
            style={{
              marginLeft: "auto",
              background: "#f87171",
              color: "#fff",
              border: 0,
              borderRadius: 7,
              padding: "7px 19px",
              fontWeight: 800,
              cursor: "pointer",
            }}
            type="button"
          >
            Logout
          </button>
        </nav>

        <div style={{ minHeight: 400 }}>
          {adminTab === "produkte" && produkteTab}
          {adminTab === "bestellungen" && bestellungenTab}
          {adminTab === "users" && usersTab}
          {adminTab === "settings" && settingsTab}
        </div>
      </div>
    );
  }

  // KURIER PANEL
  if (view === "kurier" && user?.role === "kurier") {
    // Kurier sieht alle offenen/fertigen Bestellungen
    const offeneOrders = orders.filter((o) => o.status !== "fertig");

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#18181b",
          color: "#fff",
          fontFamily: "'Inter', sans-serif",
          padding: 30,
        }}
      >
        <Broadcast msg={broadcast.text} show={showBroadcast} />
        <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 25 }}>
          Kurier Panel
        </h2>
        <button
          onClick={() => setView("home")}
          style={{
            background: "#23262e",
            color: "#fff",
            borderRadius: 10,
            border: 0,
            padding: "10px 22px",
            fontSize: 17,
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: 20,
          }}
          type="button"
        >
          ⬅️ Zurück
        </button>
        {offeneOrders.length === 0 ? (
          <div style={{ color: "#a1a1aa" }}>Keine offenen Bestellungen.</div>
        ) : (
          offeneOrders.map((order) => (
            <div
              key={order.id}
              style={{
                background: "#23262e",
                borderRadius: 12,
                padding: 15,
                marginBottom: 18,
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <b>Kunde:</b> {order.kunde}
              </div>
              <div style={{ marginBottom: 8 }}>
                <b>Status:</b>{" "}
                <select
                  value={order.status}
                  onChange={async (e) =>
                    await bestellungUpdaten(order.id, {
                      status: e.target.value,
                    })
                  }
                  style={{
                    padding: 6,
                    borderRadius: 7,
                    border: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <option value="offen">offen</option>
                  <option value="in Bearbeitung">in Bearbeitung</option>
                  <option value="fertig">fertig</option>
                  <option value="storniert">storniert</option>
                </select>
              </div>
              <div>
                <b>Produkte:</b>{" "}
                {order.warenkorb
                  .map((item) => {
                    const p = produkte.find((pr) => pr.id === item.produktId);
                    return p ? `${p.name} × ${item.menge}` : "?";
                  })
                  .join(", ")}
              </div>
              {/* Treffpunkt ändern */}
              <div style={{ marginTop: 13 }}>
                <b>Treffpunkt (ändern & speichern):</b>
                <MapContainer
                  center={order.treffpunkt || [51.5, 7]}
                  zoom={13}
                  style={{ height: 130, width: "100%", marginTop: 7 }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {order.treffpunkt && <Marker position={order.treffpunkt} />}
                  <OrderTreffpunktSelector
                    value={order.treffpunkt}
                    onChange={(pos) =>
                      bestellungUpdaten(order.id, { treffpunkt: pos })
                    }
                  />
                </MapContainer>
              </div>

              {/* Chat */}
              <div style={{ marginTop: 14 }}>
                <b>Chat mit Kunde:</b>
                <div
                  style={{
                    background: "#1e293b",
                    borderRadius: 8,
                    minHeight: 38,
                    padding: 7,
                    maxHeight: 140,
                    overflowY: "auto",
                  }}
                >
                  {order.chat?.length === 0 ? (
                    <div style={{ color: "#a1a1aa" }}>
                      Noch keine Nachrichten.
                    </div>
                  ) : (
                    order.chat.map((msg, i) => (
                      <div
                        key={i}
                        style={{
                          color: "#a3e635",
                          fontWeight: 700,
                          marginBottom: 3,
                        }}
                      >
                        {msg.user}: {msg.text}
                      </div>
                    ))
                  )}
                </div>
                <div style={{ display: "flex", marginTop: 7, gap: 7 }}>
                  <input
                    value={activeChat === order.id ? chatMsg : ""}
                    onFocus={() => setActiveChat(order.id)}
                    onChange={(e) => setChatMsg(e.target.value)}
                    placeholder="Nachricht..."
                    style={{
                      flex: 1,
                      borderRadius: 7,
                      border: 0,
                      background: "#23262e",
                      color: "#fff",
                      fontSize: 15,
                      padding: 7,
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && chatMsg.trim().length > 0) {
                        sendChatMsg(order, chatMsg.trim());
                      }
                    }}
                    type="text"
                  />
                  <button
                    onClick={() => sendChatMsg(order, chatMsg.trim())}
                    disabled={!chatMsg.trim()}
                    style={{
                      background: "#38bdf8",
                      color: "#18181b",
                      border: 0,
                      borderRadius: 7,
                      fontWeight: 700,
                      fontSize: 15,
                      padding: "6px 13px",
                      cursor: chatMsg.trim() ? "pointer" : "not-allowed",
                    }}
                    type="button"
                  >
                    📩
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
        <button
          onClick={() => {
            setUser(null);
            setView("login");
          }}
          style={{
            marginTop: 25,
            background: "#f87171",
            color: "#fff",
            border: 0,
            borderRadius: 7,
            padding: "7px 19px",
            fontWeight: 800,
            cursor: "pointer",
          }}
          type="button"
        >
          🚪 Logout
        </button>
      </div>
    );
  }

  // Default fallback
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#18181b",
        color: "#fff",
        fontFamily: "'Inter', sans-serif",
        padding: 30,
      }}
    >
      <h2>Fehler: View nicht gefunden</h2>
      <button
        onClick={() => {
          setView("login");
          setUser(null);
        }}
        type="button"
      >
        Zurück zum Login
      </button>
    </div>
  );
}

// Hilfsfunktionen & Komponenten

function navBtnStyle() {
  return {
    background: "#38bdf8",
    color: "#18181b",
    border: 0,
    borderRadius: 9,
    padding: "10px 28px",
    fontWeight: 700,
    fontSize: 18,
    cursor: "pointer",
  };
}

function tabBtnStyle(active) {
  return {
    background: active ? "#a3e635" : "#23262e",
    color: active ? "#18181b" : "#fff",
    fontWeight: 700,
    borderRadius: 10,
    border: 0,
    padding: "10px 22px",
    cursor: "pointer",
  };
}

// Map Selector Komponente
function OrderTreffpunktSelector({ value, onChange }) {
  useMapEvents({
    click(e) {
      onChange([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}
