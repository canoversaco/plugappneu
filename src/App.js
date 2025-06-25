"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// --- Leaflet Marker-Icon Fix ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// --- Dummy User-DB ---
const users = [
  { username: "kunde1", password: "pass123", role: "kunde" },
  { username: "kunde2", password: "plug420", role: "kunde" },
  { username: "plugadmin", password: "admin420", role: "admin" },
  { username: "kurier420", password: "kurierpass", role: "kurier" },
];

// --- Notification Utility ---
function notify(text, opts = {}) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(text, opts);
  }
}

// --- Karte für Treffpunkt-Auswahl ---
function SelectTreffpunkt({ value, onChange }) {
  function LocationMarker() {
    useMapEvents({
      click(e) {
        onChange([e.latlng.lat, e.latlng.lng]);
      },
    });
    return value ? <Marker position={value} /> : null;
  }
  return (
    <MapContainer
      center={value || [51.5, 7]}
      zoom={12}
      style={{ height: 260, width: "100%", borderRadius: 12 }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <LocationMarker />
    </MapContainer>
  );
}

// --- Chat-Komponente ---
function Chat({ chat, sendMsg, disabled, who }) {
  const [msg, setMsg] = useState("");
  return (
    <div
      style={{
        background: "#191a1f",
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <div style={{ fontSize: 12, color: "#90cdf4" }}>Chat</div>
      <div
        style={{
          minHeight: 40,
          maxHeight: 120,
          overflowY: "auto",
          marginBottom: 4,
        }}
      >
        {chat.map((c, i) => (
          <div
            key={i}
            style={{
              fontSize: 14,
              color: c.from === "kunde" ? "#bbf7d0" : "#f9a8d4",
            }}
          >
            <b>
              {c.from === who
                ? "Du"
                : c.from === "kunde"
                ? "Kunde"
                : "Kurier/Admin"}
              :
            </b>{" "}
            {c.text}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && msg && sendMsg(msg, setMsg)}
          disabled={disabled}
          placeholder={disabled ? "Nicht verfügbar" : "Nachricht..."}
          style={{
            flex: 1,
            borderRadius: 4,
            padding: 4,
            border: "1px solid #23262e",
            background: "#23262e",
            color: "#fff",
          }}
        />
        <button
          onClick={() => msg && sendMsg(msg, setMsg)}
          disabled={disabled}
          style={{
            padding: "2px 10px",
            borderRadius: 4,
            background: "#2563eb",
            color: "#fff",
            border: 0,
          }}
        >
          Senden
        </button>
      </div>
    </div>
  );
}

// --- Status-Badge ---
function StatusBadge({ status }) {
  const colors = {
    offen: "#fbbf24",
    angenommen: "#38bdf8",
    unterwegs: "#818cf8",
    angekommen: "#22d3ee",
    abgeschlossen: "#22c55e",
  };
  return (
    <span
      style={{
        background: colors[status] || "#6b7280",
        color: "#18181b",
        borderRadius: 8,
        fontSize: 12,
        padding: "2px 10px",
        marginLeft: 6,
      }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// --- Broadcast-Banner ---
function BroadcastBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: "#fde047",
        color: "#18181b",
        padding: 13,
        textAlign: "center",
        fontWeight: 600,
      }}
    >
      {message}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            marginLeft: 18,
            background: "#18181b",
            color: "#fde047",
            border: 0,
            borderRadius: 5,
            padding: "2px 12px",
            fontWeight: 600,
          }}
        >
          OK
        </button>
      )}
    </div>
  );
}

// --- Cart-Icon ---
function CartIcon({ count, onClick }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 900,
        background: "#23262e",
        borderRadius: "50%",
        width: 54,
        height: 54,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 0 16px #18181b60",
      }}
      onClick={onClick}
      title="Warenkorb öffnen"
    >
      <span style={{ fontSize: 30, lineHeight: 1 }}>🛒</span>
      {count > 0 && (
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "#f87171",
            color: "#fff",
            borderRadius: "50%",
            width: 22,
            height: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            fontWeight: 700,
            border: "2px solid #23262e",
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

// --- Cart-Popup ---
function CartPopup({
  visible,
  warenkorb,
  produkte,
  onChange,
  onClose,
  onOrder,
  summe,
  checkLager,
  errorMsg,
}) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "#18181baa",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#23262e",
          borderRadius: 14,
          padding: 24,
          minWidth: 300,
          minHeight: 180,
          boxShadow: "0 0 20px #18181b90",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 19, marginBottom: 16 }}>
          🛒 Dein Warenkorb
        </div>
        {warenkorb.length === 0 ? (
          <div style={{ color: "#a1a1aa", marginBottom: 12 }}>
            Der Warenkorb ist leer.
          </div>
        ) : (
          <div>
            {warenkorb.map((item, idx) => {
              const produkt = produkte.find((p) => p.id === item.produktId);
              return (
                <div
                  key={produkt.id}
                  style={{
                    display: "flex",
                    gap: 9,
                    alignItems: "center",
                    marginBottom: 7,
                  }}
                >
                  <span style={{ fontWeight: 600, minWidth: 80 }}>
                    {produkt.name}
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={produkt.bestand}
                    value={item.menge}
                    onChange={(e) => {
                      let val = parseInt(e.target.value);
                      if (val > produkt.bestand) val = produkt.bestand;
                      if (val < 1) val = 1;
                      onChange(item.produktId, val);
                    }}
                    style={{
                      width: 50,
                      borderRadius: 6,
                      border: "1px solid #23262e",
                      background: "#191a1f",
                      color: "#fff",
                      padding: 4,
                    }}
                  />
                  <span style={{ fontSize: 13, color: "#a1a1aa" }}>
                    {produkt.preis} € x
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {(produkt.preis * item.menge).toFixed(2)} €
                  </span>
                  <button
                    onClick={() => onChange(item.produktId, 0)}
                    style={{
                      marginLeft: 10,
                      background: "#f87171",
                      color: "#18181b",
                      border: 0,
                      borderRadius: 6,
                      padding: "2px 9px",
                      fontWeight: 600,
                    }}
                  >
                    🗑️
                  </button>
                  <span
                    style={{ color: "#fde047", fontSize: 12, marginLeft: 4 }}
                  >
                    Bestand: {produkt.bestand}{" "}
                    {produkt.bestand === 0
                      ? "(Ausverkauft)"
                      : produkt.bestand < 6
                      ? "⚠️ nur noch wenige!"
                      : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ margin: "15px 0 5px 0", fontWeight: 600, fontSize: 17 }}>
          Summe: {summe().toFixed(2)} €
        </div>
        {errorMsg && (
          <div style={{ color: "#f87171", marginBottom: 6 }}>{errorMsg}</div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button
            onClick={onOrder}
            style={{
              background: "#22c55e",
              color: "#18181b",
              fontWeight: 600,
              padding: "8px 18px",
              borderRadius: 8,
              border: 0,
            }}
            disabled={warenkorb.length === 0 || !checkLager()}
          >
            Zur Kasse
          </button>
          <button
            onClick={onClose}
            style={{
              background: "#23262e",
              color: "#fff",
              padding: "8px 18px",
              borderRadius: 8,
              border: 0,
            }}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
export default function PlugApp() {
  // Broadcast
  const [broadcast, setBroadcast] = useState("");
  const [showBroadcast, setShowBroadcast] = useState(true);

  // Auth & User
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [user, setUser] = useState(null);
  const [view, setView] = useState("home");

  // Produkte (mit Lagerbestand)
  const [produkte, setProdukte] = useState([
    {
      id: 1,
      name: "Grün",
      preis: 7,
      einheit: "g",
      beschreibung: "Top Qualität",
      bestand: 20,
    },
    {
      id: 2,
      name: "Weiß",
      preis: 80,
      einheit: "g",
      beschreibung: "Feinstes Premium-Produkt",
      bestand: 10,
    },
  ]);
  const [warenkorb, setWarenkorb] = useState([]);
  // Extra States für Bestellansicht
  const [treffpunkt, setTreffpunkt] = useState([51.5, 7]);
  const [notiz, setNotiz] = useState("");
  const [error, setError] = useState("");
  // Krypto/Bar Auswahl
  const [orderZahlung, setOrderZahlung] = useState("bar");

  // Bestellungen (global)
  const [orders, setOrders] = useState([]);
  const [info, setInfo] = useState("");
  // Admin-Panel Zustand
  const [adminPanel, setAdminPanel] = useState("dashboard");
  // Produkt in Bearbeitung (Admin)
  const [produktEdit, setProduktEdit] = useState(null);
  const [newProdukt, setNewProdukt] = useState({
    name: "",
    preis: "",
    einheit: "",
    beschreibung: "",
    bestand: "",
  });

  // Warenkorb-Popup
  const [cartOpen, setCartOpen] = useState(false);
  const [cartError, setCartError] = useState("");

  // --- Notification: Permission holen
  useEffect(() => {
    if (
      loggedIn &&
      "Notification" in window &&
      Notification.permission !== "granted"
    ) {
      Notification.requestPermission();
    }
  }, [loggedIn]);

  // Chat & Notification bei Nachricht
  function sendOrderMsg(orderId, text, from) {
    setOrders((orders) =>
      orders.map((o) => {
        if (o.id === orderId) {
          if (from !== user.role) {
            if (user.role === "kunde" && o.kunde === user.username) {
              notify("Neue Chat-Nachricht zu deiner Bestellung!", {
                body: text,
              });
            }
            if (user.role === "kurier" && o.kurier === user.username) {
              notify("Neue Chat-Nachricht zu deiner Lieferung!", {
                body: text,
              });
            }
            if (user.role === "admin") {
              notify("Neue Chat-Nachricht!", { body: text });
            }
          }
          return { ...o, chat: [...o.chat, { from, text, ts: Date.now() }] };
        }
        return o;
      })
    );
  }

  // LOGIN LOGIK
  function doLogin() {
    const found = users.find(
      (u) => u.username === loginName && u.password === loginPass
    );
    if (!found) return setInfo("Login fehlgeschlagen!");
    setUser(found);
    setLoggedIn(true);
    setView("home");
    setInfo("");
  }

  // Warenkorb-Logik
  const warenkorbCount = warenkorb.reduce((a, x) => a + x.menge, 0);
  function summe() {
    return warenkorb.reduce((a, c) => {
      const p = produkte.find((x) => x.id === c.produktId);
      return a + (p ? p.preis * c.menge : 0);
    }, 0);
  }
  function checkLager() {
    return warenkorb.every((item) => {
      const p = produkte.find((x) => x.id === item.produktId);
      return p && p.bestand >= item.menge;
    });
  }

  // Rabattberechnung für Krypto
  function berechneKryptoRabatt(betrag) {
    if (betrag >= 501 && betrag <= 1500) return 0.05;
    if (betrag >= 251) return 0.08;
    if (betrag >= 101) return 0.1;
    if (betrag >= 0) return 0.15;
    return 0;
  }

  // Notification bei Statuswechsel
  function setOrderStatus(id, status) {
    setOrders((orders) =>
      orders.map((o) => {
        if (o.id === id) {
          if (user.role === "kunde" && o.kunde === user.username) {
            if (status === "unterwegs")
              notify("Deine Bestellung ist unterwegs!");
            if (status === "angenommen")
              notify("Deine Bestellung wurde angenommen!");
            if (status === "abgeschlossen")
              notify("Deine Bestellung ist abgeschlossen!");
          }
          return { ...o, status };
        }
        return o;
      })
    );
  }

  // ===== VIEWS =====

  // --- LOGIN ---
  if (!loggedIn) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#09090b",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
        }}
      >
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 32 }}>
          Plug Login
        </h1>
        <input
          type="text"
          placeholder="Benutzername"
          style={{
            marginBottom: 8,
            padding: 8,
            borderRadius: 6,
            background: "#23262e",
            color: "#fff",
            width: 210,
            border: 0,
          }}
          value={loginName}
          onChange={(e) => setLoginName(e.target.value)}
        />
        <input
          type="password"
          placeholder="Passwort"
          style={{
            marginBottom: 16,
            padding: 8,
            borderRadius: 6,
            background: "#23262e",
            color: "#fff",
            width: 210,
            border: 0,
          }}
          value={loginPass}
          onChange={(e) => setLoginPass(e.target.value)}
        />
        <button
          onClick={doLogin}
          style={{
            background: "#22c55e",
            color: "#18181b",
            fontWeight: 600,
            padding: "8px 24px",
            borderRadius: 6,
            border: 0,
            fontSize: 18,
            marginBottom: 16,
          }}
        >
          Einloggen
        </button>
        {info && <div style={{ marginTop: 8, color: "#f87171" }}>{info}</div>}
      </div>
    );
  }

  // --- Broadcast ---
  if (broadcast && showBroadcast) {
    return (
      <BroadcastBanner
        message={broadcast}
        onClose={() => setShowBroadcast(false)}
      />
    );
  }
  // --- HOME ---
  if (view === "home") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#18181b",
          color: "#fff",
          padding: 30,
        }}
      >
        <h1 style={{ fontSize: 29, fontWeight: 700, marginBottom: 19 }}>
          Willkommen, {user.username}!
        </h1>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 25,
          }}
        >
          <button
            style={{
              background: "#38bdf8",
              color: "#18181b",
              padding: "14px 32px",
              fontWeight: 700,
              borderRadius: 12,
              fontSize: 18,
              border: 0,
            }}
            onClick={() => setView("menü")}
          >
            🧾 Zum Menü
          </button>
          <button
            style={{
              background: "#a3e635",
              color: "#18181b",
              padding: "14px 32px",
              fontWeight: 700,
              borderRadius: 12,
              fontSize: 18,
              border: 0,
            }}
            onClick={() => setView("meine")}
          >
            📦 Meine Bestellungen
          </button>
          {user.role === "admin" && (
            <button
              style={{
                background: "#facc15",
                color: "#18181b",
                padding: "14px 32px",
                fontWeight: 700,
                borderRadius: 12,
                fontSize: 18,
                border: 0,
              }}
              onClick={() => setView("admin")}
            >
              🔧 Admin Panel
            </button>
          )}
          {user.role === "kurier" && (
            <button
              style={{
                background: "#818cf8",
                color: "#18181b",
                padding: "14px 32px",
                fontWeight: 700,
                borderRadius: 12,
                fontSize: 18,
                border: 0,
              }}
              onClick={() => setView("kurier")}
            >
              🚗 Kurier-Panel
            </button>
          )}
          <button
            style={{
              background: "#23262e",
              color: "#fff",
              padding: "14px 32px",
              fontWeight: 700,
              borderRadius: 12,
              fontSize: 18,
              border: 0,
              marginLeft: 12,
            }}
            onClick={() => {
              setLoggedIn(false);
              setUser(null);
              setLoginName("");
              setLoginPass("");
              setView("home");
            }}
          >
            🚪 Logout
          </button>
        </div>
        <CartIcon count={warenkorbCount} onClick={() => setCartOpen(true)} />
        <CartPopup
          visible={cartOpen}
          warenkorb={warenkorb}
          produkte={produkte}
          onChange={(pid, menge) =>
            setWarenkorb(
              menge === 0
                ? warenkorb.filter((w) => w.produktId !== pid)
                : warenkorb.map((w) =>
                    w.produktId === pid ? { ...w, menge } : w
                  )
            )
          }
          onClose={() => setCartOpen(false)}
          onOrder={() => {
            setCartOpen(false);
            setView("order");
          }}
          summe={summe}
          checkLager={checkLager}
          errorMsg={cartError}
        />
      </div>
    );
  }

  // --- MENÜ ---
  if (view === "menü") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#18181b",
          color: "#fff",
          padding: 30,
        }}
      >
        <h2 style={{ fontSize: 23, fontWeight: 700, marginBottom: 18 }}>
          🧾 Produkt-Menü
        </h2>
        <div
          style={{
            display: "flex",
            gap: 17,
            flexWrap: "wrap",
            marginBottom: 30,
          }}
        >
          {produkte.map((p) => (
            <div
              key={p.id}
              style={{
                background: "#23262e",
                borderRadius: 14,
                padding: 18,
                minWidth: 220,
                marginBottom: 10,
                boxShadow: "0 2px 10px #0002",
              }}
            >
              <h3 style={{ fontWeight: 700, fontSize: 19 }}>{p.name}</h3>
              <div style={{ fontSize: 15, marginBottom: 3 }}>
                {p.beschreibung}
              </div>
              <div style={{ fontSize: 13, color: "#b1b1b1" }}>
                {p.preis} € / {p.einheit}
              </div>
              <div style={{ color: "#fde047", fontSize: 13, margin: "7px 0" }}>
                Bestand: {p.bestand}{" "}
                {p.bestand === 0
                  ? "(Ausverkauft)"
                  : p.bestand < 6
                  ? "⚠️ nur noch wenige!"
                  : ""}
              </div>
              <button
                onClick={() => {
                  if (p.bestand === 0)
                    return setCartError("Produkt ausverkauft!");
                  const already = warenkorb.find((w) => w.produktId === p.id);
                  if (already) {
                    if (already.menge >= p.bestand)
                      return setCartError("Maximal verfügbare Menge erreicht!");
                    setWarenkorb(
                      warenkorb.map((w) =>
                        w.produktId === p.id ? { ...w, menge: w.menge + 1 } : w
                      )
                    );
                  } else {
                    setWarenkorb([...warenkorb, { produktId: p.id, menge: 1 }]);
                  }
                }}
                disabled={p.bestand === 0}
                style={{
                  background: p.bestand === 0 ? "#bdbdbd" : "#38bdf8",
                  color: "#18181b",
                  fontWeight: 600,
                  borderRadius: 8,
                  fontSize: 16,
                  border: 0,
                  padding: "8px 16px",
                  marginTop: 8,
                }}
              >
                In Warenkorb
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setView("home")}
          style={{
            background: "#23262e",
            color: "#fff",
            padding: "10px 22px",
            borderRadius: 8,
            border: 0,
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Zurück
        </button>
        <CartIcon count={warenkorbCount} onClick={() => setCartOpen(true)} />
        <CartPopup
          visible={cartOpen}
          warenkorb={warenkorb}
          produkte={produkte}
          onChange={(pid, menge) =>
            setWarenkorb(
              menge === 0
                ? warenkorb.filter((w) => w.produktId !== pid)
                : warenkorb.map((w) =>
                    w.produktId === pid ? { ...w, menge } : w
                  )
            )
          }
          onClose={() => setCartOpen(false)}
          onOrder={() => {
            setCartOpen(false);
            setView("order");
          }}
          summe={summe}
          checkLager={checkLager}
          errorMsg={cartError}
        />
      </div>
    );
  }

  // --- BESTELLUNG (ORDER) ---
  if (view === "order") {
    const sum = summe();
    const rabatt = orderZahlung === "krypto" ? berechneKryptoRabatt(sum) : 0;
    const endpreis = orderZahlung === "krypto" ? sum * (1 - rabatt) : sum;
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#18181b",
          color: "#fff",
          padding: 30,
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 15 }}>
          🛒 Bestellung abschließen
        </h2>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 7 }}>
            Treffpunkt wählen:
          </div>
          <div
            style={{
              border: "2px solid #23262e",
              borderRadius: 14,
              overflow: "hidden",
              marginBottom: 7,
            }}
          >
            <SelectTreffpunkt value={treffpunkt} onChange={setTreffpunkt} />
          </div>
          <div style={{ fontSize: 14, color: "#bdbdbd", marginBottom: 8 }}>
            Tippe auf die Karte, um deinen Treffpunkt festzulegen.
          </div>
          <div>
            <label>Optionaler Hinweis an den Fahrer:</label>
            <input
              style={{
                marginTop: 3,
                marginBottom: 14,
                width: "100%",
                borderRadius: 8,
                border: 0,
                padding: 8,
                background: "#23262e",
                color: "#fff",
              }}
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              placeholder="z.B. rote Jacke, Hund dabei..."
            />
          </div>
        </div>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>
          Warenkorb:
        </div>
        <div style={{ marginBottom: 12 }}>
          {warenkorb.map((item, i) => {
            const produkt = produkte.find((x) => x.id === item.produktId);
            return (
              <div key={i} style={{ marginBottom: 5 }}>
                <b>{produkt.name}</b> × {item.menge} &nbsp;
                <span style={{ color: "#a3e635" }}>
                  {(produkt.preis * item.menge).toFixed(2)} €
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
          Zahlungsart wählen:
        </div>
        <div style={{ marginBottom: 14 }}>
          <label>
            <input
              type="radio"
              name="zahlung"
              checked={orderZahlung === "bar"}
              onChange={() => setOrderZahlung("bar")}
            />{" "}
            Barzahlung
          </label>
          <label style={{ marginLeft: 16 }}>
            <input
              type="radio"
              name="zahlung"
              checked={orderZahlung === "krypto"}
              onChange={() => setOrderZahlung("krypto")}
            />{" "}
            Krypto (BTC, LTC, XMR, USDT)
          </label>
        </div>
        {orderZahlung === "krypto" && (
          <div
            style={{
              marginBottom: 18,
              background: "#18181b",
              border: "1px solid #22d3ee",
              borderRadius: 7,
              padding: 11,
              color: "#a3e635",
            }}
          >
            <b>Krypto-Anleitung:</b>
            <ul>
              <li>
                1. Erstelle ein Wallet (z.B.{" "}
                <a
                  href="https://trustwallet.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#22d3ee" }}
                >
                  TrustWallet
                </a>
                ,{" "}
                <a
                  href="https://exodus.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#22d3ee" }}
                >
                  Exodus
                </a>
                ).
              </li>
              <li>
                2. Kaufe Bitcoin (BTC), Litecoin (LTC), Monero (XMR) oder USDT
                z.B. bei{" "}
                <a
                  href="https://www.binance.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#22d3ee" }}
                >
                  Binance
                </a>{" "}
                oder{" "}
                <a
                  href="https://www.kraken.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#22d3ee" }}
                >
                  Kraken
                </a>
                .
              </li>
              <li>
                3. Sende den gewünschten Betrag nach Abschluss deiner Bestellung
                an die angezeigte Adresse.
              </li>
              <li>4. Die Zahlung wird nach Bestätigung überprüft.</li>
            </ul>
          </div>
        )}
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
          Summe: {sum.toFixed(2)} €
        </div>
        {orderZahlung === "krypto" && (
          <div
            style={{
              color: "#22d3ee",
              fontWeight: 600,
              fontSize: 15,
              marginBottom: 8,
            }}
          >
            Krypto-Rabatt: -{Math.round(rabatt * 100)}% →{" "}
            <span style={{ color: "#a3e635" }}>{endpreis.toFixed(2)} €</span>
          </div>
        )}
        {error && (
          <div style={{ color: "#f87171", marginBottom: 10 }}>{error}</div>
        )}
        <div style={{ display: "flex", gap: 16 }}>
          <button
            onClick={() => {
              // Prüfen ob alles verfügbar
              if (!checkLager()) {
                setError(
                  "Ein oder mehrere Produkte übersteigen den Lagerbestand!"
                );
                return;
              }
              if (!treffpunkt) {
                setError("Bitte wähle einen Treffpunkt!");
                return;
              }
              // Lager aktualisieren
              const neueProdukte = produkte.map((p) => {
                const imWarenkorb = warenkorb.find((w) => w.produktId === p.id);
                return imWarenkorb
                  ? { ...p, bestand: p.bestand - imWarenkorb.menge }
                  : p;
              });
              setProdukte(neueProdukte);
              // Bestellung erzeugen
              const order = {
                id: Date.now(),
                kunde: user.username,
                status: "offen",
                warenkorb: [...warenkorb],
                treffpunkt,
                notiz,
                chat: [],
                ts: new Date().toISOString(),
                zahlung: orderZahlung,
                rabatt: orderZahlung === "krypto" ? rabatt : 0,
                endpreis: endpreis,
              };
              setOrders([order, ...orders]);
              setWarenkorb([]);
              setError("");
              setNotiz("");
              setView("meine");
              notify("Bestellung erfolgreich aufgegeben!", {});
            }}
            style={{
              background: "#22c55e",
              color: "#18181b",
              padding: "11px 24px",
              fontWeight: 700,
              borderRadius: 8,
              fontSize: 17,
              border: 0,
            }}
          >
            Bestellen
          </button>
          <button
            onClick={() => setView("menü")}
            style={{
              background: "#23262e",
              color: "#fff",
              padding: "11px 24px",
              borderRadius: 8,
              border: 0,
              fontWeight: 600,
              fontSize: 17,
            }}
          >
            Abbrechen
          </button>
        </div>
      </div>
    );
  }
  // --- MEINE BESTELLUNGEN ---
  if (view === "meine") {
    const meineOrders =
      user.role === "admin"
        ? orders
        : orders.filter((o) => o.kunde === user.username);

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#18181b",
          color: "#fff",
          padding: 30,
        }}
      >
        <h2 style={{ fontSize: 23, fontWeight: 700, marginBottom: 14 }}>
          📜 Bestellungen
        </h2>
        {meineOrders.length === 0 ? (
          <div style={{ color: "#a1a1aa" }}>Keine Bestellungen vorhanden.</div>
        ) : (
          <div>
            {meineOrders.map((order) => (
              <div
                key={order.id}
                style={{
                  background: "#23262e",
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 13,
                  boxShadow: "0 2px 10px #0001",
                }}
              >
                <div style={{ fontSize: 17, fontWeight: 700 }}>
                  Bestellung vom {new Date(order.ts).toLocaleString()}
                  <StatusBadge status={order.status} />
                </div>
                <div>
                  <b>Produkte:</b>
                  <ul
                    style={{
                      margin: "3px 0 3px 0",
                      paddingLeft: 16,
                      fontSize: 14,
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
                <div style={{ margin: "8px 0 4px 0", fontWeight: 600 }}>
                  Treffpunkt:{" "}
                  <span style={{ color: "#a3e635" }}>
                    {order.treffpunkt?.[0]?.toFixed?.(4)},
                    {order.treffpunkt?.[1]?.toFixed?.(4)}
                  </span>
                </div>
                {order.notiz && (
                  <div style={{ fontSize: 13, color: "#a1a1aa" }}>
                    Hinweis: {order.notiz}
                  </div>
                )}
                <div style={{ fontSize: 15, margin: "4px 0 6px 0" }}>
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
                <div style={{ fontWeight: 600, color: "#22d3ee" }}>
                  Summe:{" "}
                  {order.warenkorb
                    .reduce((a, x) => {
                      const p = produkte.find((p) => p.id === x.produktId);
                      return a + (p ? p.preis * x.menge : 0);
                    }, 0)
                    .toFixed(2)}{" "}
                  €
                </div>
                <Chat
                  chat={order.chat}
                  who={user.role}
                  disabled={order.status === "abgeschlossen"}
                  sendMsg={(msg, setMsg) => {
                    sendOrderMsg(order.id, msg, user.role);
                    setMsg("");
                  }}
                />
                {user.role !== "admin" && order.status === "offen" && (
                  <button
                    onClick={() => {
                      setOrders(orders.filter((o) => o.id !== order.id));
                      setProdukte(
                        produkte.map((p) => {
                          const item = order.warenkorb.find(
                            (w) => w.produktId === p.id
                          );
                          return item
                            ? { ...p, bestand: p.bestand + item.menge }
                            : p;
                        })
                      );
                    }}
                    style={{
                      background: "#f87171",
                      color: "#18181b",
                      padding: "6px 14px",
                      borderRadius: 7,
                      border: 0,
                      fontWeight: 600,
                    }}
                  >
                    Stornieren
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => setView("home")}
          style={{
            background: "#23262e",
            color: "#fff",
            padding: "10px 22px",
            borderRadius: 8,
            border: 0,
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Zurück
        </button>
      </div>
    );
  }

  // --- KURIER PANEL ---
  if (view === "kurier") {
    const offeneOrders = orders.filter((o) => o.status === "offen");
    const meineOrders = orders.filter((o) => o.kurier === user.username);
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#18181b",
          color: "#fff",
          padding: 30,
        }}
      >
        <h2 style={{ fontSize: 23, fontWeight: 700, marginBottom: 16 }}>
          🚗 Kurier-Panel
        </h2>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 7 }}>
          Offene Bestellungen
        </div>
        {offeneOrders.length === 0 ? (
          <div style={{ color: "#a1a1aa", marginBottom: 12 }}>
            Keine offenen Bestellungen.
          </div>
        ) : (
          offeneOrders.map((order) => (
            <div
              key={order.id}
              style={{
                background: "#23262e",
                borderRadius: 12,
                padding: 13,
                marginBottom: 12,
              }}
            >
              <div style={{ fontWeight: 600 }}>
                Bestellung von {order.kunde}
              </div>
              <div>
                <b>Produkte:</b>
                <ul
                  style={{
                    margin: "3px 0 3px 0",
                    paddingLeft: 16,
                    fontSize: 14,
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
                Treffpunkt:{" "}
                <span style={{ color: "#a3e635" }}>
                  {order.treffpunkt?.[0]?.toFixed(4)},
                  {order.treffpunkt?.[1]?.toFixed(4)}
                </span>
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
              <button
                style={{
                  marginTop: 7,
                  background: "#38bdf8",
                  color: "#18181b",
                  padding: "5px 14px",
                  borderRadius: 8,
                  border: 0,
                  fontWeight: 600,
                }}
                onClick={() =>
                  setOrders(
                    orders.map((o) =>
                      o.id === order.id
                        ? { ...o, status: "angenommen", kurier: user.username }
                        : o
                    )
                  )
                }
              >
                Annehmen
              </button>
            </div>
          ))
        )}
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            marginBottom: 7,
            marginTop: 18,
          }}
        >
          Meine Lieferungen
        </div>
        {meineOrders.length === 0 ? (
          <div style={{ color: "#a1a1aa" }}>Keine eigenen Lieferungen.</div>
        ) : (
          meineOrders.map((order) => (
            <div
              key={order.id}
              style={{
                background: "#23262e",
                borderRadius: 12,
                padding: 13,
                marginBottom: 12,
              }}
            >
              <div style={{ fontWeight: 600 }}>
                Lieferung für {order.kunde}{" "}
                <StatusBadge status={order.status} />
              </div>
              <div>
                <b>Produkte:</b>
                <ul
                  style={{
                    margin: "3px 0 3px 0",
                    paddingLeft: 16,
                    fontSize: 14,
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
                Treffpunkt:{" "}
                <span style={{ color: "#a3e635" }}>
                  {order.treffpunkt?.[0]?.toFixed(4)},
                  {order.treffpunkt?.[1]?.toFixed(4)}
                </span>
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
              <button
                style={{
                  marginTop: 7,
                  background: "#818cf8",
                  color: "#18181b",
                  padding: "5px 14px",
                  borderRadius: 8,
                  border: 0,
                  fontWeight: 600,
                }}
                disabled={order.status !== "angenommen"}
                onClick={() => setOrderStatus(order.id, "unterwegs")}
              >
                Unterwegs
              </button>
              <button
                style={{
                  marginTop: 7,
                  marginLeft: 10,
                  background: "#22d3ee",
                  color: "#18181b",
                  padding: "5px 14px",
                  borderRadius: 8,
                  border: 0,
                  fontWeight: 600,
                }}
                disabled={order.status !== "unterwegs"}
                onClick={() => setOrderStatus(order.id, "angekommen")}
              >
                Angekommen
              </button>
              <button
                style={{
                  marginTop: 7,
                  marginLeft: 10,
                  background: "#22c55e",
                  color: "#18181b",
                  padding: "5px 14px",
                  borderRadius: 8,
                  border: 0,
                  fontWeight: 600,
                }}
                disabled={order.status !== "angekommen"}
                onClick={() => setOrderStatus(order.id, "abgeschlossen")}
              >
                Abgeschlossen
              </button>
              <Chat
                chat={order.chat}
                who={user.role}
                disabled={order.status === "abgeschlossen"}
                sendMsg={(msg, setMsg) => {
                  sendOrderMsg(order.id, msg, user.role);
                  setMsg("");
                }}
              />
            </div>
          ))
        )}
        <button
          onClick={() => setView("home")}
          style={{
            background: "#23262e",
            color: "#fff",
            padding: "10px 22px",
            borderRadius: 8,
            border: 0,
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Zurück
        </button>
      </div>
    );
  }

  // --- ADMIN PANEL ---
  if (view === "admin") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#18181b",
          color: "#fff",
          padding: 30,
        }}
      >
        <h2 style={{ fontSize: 23, fontWeight: 700, marginBottom: 14 }}>
          🔧 Admin Panel
        </h2>
        <div style={{ marginBottom: 22 }}>
          <button
            onClick={() => setAdminPanel("dashboard")}
            style={{
              background: adminPanel === "dashboard" ? "#facc15" : "#23262e",
              color: "#18181b",
              fontWeight: 700,
              borderRadius: 9,
              padding: "7px 19px",
              border: 0,
              marginRight: 9,
            }}
          >
            Produkte
          </button>
          <button
            onClick={() => setAdminPanel("orders")}
            style={{
              background: adminPanel === "orders" ? "#facc15" : "#23262e",
              color: "#18181b",
              fontWeight: 700,
              borderRadius: 9,
              padding: "7px 19px",
              border: 0,
            }}
          >
            Bestellungen
          </button>
        </div>

        {adminPanel === "dashboard" && (
          <div style={{ marginBottom: 35 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Produkte verwalten
            </h3>
            {produkte.map((p, i) => (
              <div
                key={p.id}
                style={{
                  background: "#23262e",
                  padding: 9,
                  borderRadius: 7,
                  marginBottom: 7,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <input
                  value={p.name}
                  onChange={(e) =>
                    setProdukte(
                      produkte.map((pr, j) =>
                        j === i ? { ...pr, name: e.target.value } : pr
                      )
                    )
                  }
                  className="bg-gray-900 p-1 rounded w-32"
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    borderRadius: 5,
                    padding: 4,
                    border: 0,
                    background: "#191a1f",
                    color: "#fff",
                  }}
                />
                <input
                  value={p.preis}
                  type="number"
                  min="0"
                  onChange={(e) =>
                    setProdukte(
                      produkte.map((pr, j) =>
                        j === i
                          ? { ...pr, preis: parseFloat(e.target.value) || 0 }
                          : pr
                      )
                    )
                  }
                  className="bg-gray-900 p-1 rounded w-24"
                  style={{
                    fontWeight: 500,
                    fontSize: 15,
                    borderRadius: 5,
                    padding: 4,
                    border: 0,
                    background: "#191a1f",
                    color: "#fff",
                    width: 70,
                  }}
                />
                <input
                  value={p.einheit}
                  onChange={(e) =>
                    setProdukte(
                      produkte.map((pr, j) =>
                        j === i ? { ...pr, einheit: e.target.value } : pr
                      )
                    )
                  }
                  className="bg-gray-900 p-1 rounded w-20"
                  style={{
                    fontSize: 15,
                    borderRadius: 5,
                    padding: 4,
                    border: 0,
                    background: "#191a1f",
                    color: "#fff",
                    width: 60,
                  }}
                  placeholder="Einheit"
                />
                <input
                  value={p.beschreibung}
                  onChange={(e) =>
                    setProdukte(
                      produkte.map((pr, j) =>
                        j === i ? { ...pr, beschreibung: e.target.value } : pr
                      )
                    )
                  }
                  className="bg-gray-900 p-1 rounded w-64"
                  style={{
                    fontSize: 15,
                    borderRadius: 5,
                    padding: 4,
                    border: 0,
                    background: "#191a1f",
                    color: "#fff",
                    width: 170,
                  }}
                  placeholder="Beschreibung"
                />
                <input
                  value={p.bestand}
                  type="number"
                  min="0"
                  onChange={(e) =>
                    setProdukte(
                      produkte.map((pr, j) =>
                        j === i
                          ? { ...pr, bestand: parseInt(e.target.value) || 0 }
                          : pr
                      )
                    )
                  }
                  style={{
                    width: 54,
                    borderRadius: 5,
                    padding: 4,
                    background: "#191a1f",
                    color: "#fff",
                    border: 0,
                    fontWeight: 600,
                  }}
                />
                <span style={{ color: "#fde047", fontSize: 13, marginLeft: 7 }}>
                  Lager: {p.bestand}
                </span>
                <button
                  onClick={() =>
                    setProdukte(produkte.filter((_, j) => j !== i))
                  }
                  style={{
                    background: "#f87171",
                    color: "#18181b",
                    border: 0,
                    borderRadius: 6,
                    padding: "2px 10px",
                    fontWeight: 700,
                    marginLeft: 6,
                  }}
                >
                  Löschen
                </button>
              </div>
            ))}
            <div style={{ fontWeight: 600, fontSize: 15, marginTop: 9 }}>
              Neues Produkt:
            </div>
            <div style={{ display: "flex", gap: 7, marginBottom: 7 }}>
              <input
                value={newProdukt.name}
                onChange={(e) =>
                  setNewProdukt({ ...newProdukt, name: e.target.value })
                }
                placeholder="Name"
                style={{
                  borderRadius: 5,
                  padding: 4,
                  border: 0,
                  background: "#191a1f",
                  color: "#fff",
                  width: 90,
                }}
              />
              <input
                value={newProdukt.preis}
                type="number"
                min="0"
                onChange={(e) =>
                  setNewProdukt({ ...newProdukt, preis: e.target.value })
                }
                placeholder="Preis"
                style={{
                  borderRadius: 5,
                  padding: 4,
                  border: 0,
                  background: "#191a1f",
                  color: "#fff",
                  width: 60,
                }}
              />
              <input
                value={newProdukt.einheit}
                onChange={(e) =>
                  setNewProdukt({ ...newProdukt, einheit: e.target.value })
                }
                placeholder="Einheit"
                style={{
                  borderRadius: 5,
                  padding: 4,
                  border: 0,
                  background: "#191a1f",
                  color: "#fff",
                  width: 60,
                }}
              />
              <input
                value={newProdukt.beschreibung}
                onChange={(e) =>
                  setNewProdukt({ ...newProdukt, beschreibung: e.target.value })
                }
                placeholder="Beschreibung"
                style={{
                  borderRadius: 5,
                  padding: 4,
                  border: 0,
                  background: "#191a1f",
                  color: "#fff",
                  width: 140,
                }}
              />
              <input
                value={newProdukt.bestand}
                type="number"
                min="0"
                onChange={(e) =>
                  setNewProdukt({ ...newProdukt, bestand: e.target.value })
                }
                placeholder="Bestand"
                style={{
                  borderRadius: 5,
                  padding: 4,
                  border: 0,
                  background: "#191a1f",
                  color: "#fff",
                  width: 60,
                }}
              />
              <button
                onClick={() => {
                  if (!newProdukt.name || !newProdukt.preis) return;
                  setProdukte([
                    ...produkte,
                    {
                      id: Date.now(),
                      name: newProdukt.name,
                      preis: parseFloat(newProdukt.preis) || 0,
                      einheit: newProdukt.einheit,
                      beschreibung: newProdukt.beschreibung,
                      bestand: parseInt(newProdukt.bestand) || 0,
                    },
                  ]);
                  setNewProdukt({
                    name: "",
                    preis: "",
                    einheit: "",
                    beschreibung: "",
                    bestand: "",
                  });
                }}
                style={{
                  background: "#38bdf8",
                  color: "#18181b",
                  border: 0,
                  borderRadius: 7,
                  fontWeight: 700,
                  padding: "2px 12px",
                }}
              >
                +
              </button>
            </div>
          </div>
        )}

        {adminPanel === "orders" && (
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Alle Bestellungen
            </h3>
            {orders.length === 0 ? (
              <div style={{ color: "#a1a1aa" }}>
                Keine Bestellungen vorhanden.
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    background: "#23262e",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 11,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    {order.kunde} ({new Date(order.ts).toLocaleString()}){" "}
                    <StatusBadge status={order.status} />
                  </div>
                  <div>
                    <b>Produkte:</b>
                    <ul
                      style={{
                        margin: "3px 0 3px 0",
                        paddingLeft: 16,
                        fontSize: 14,
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
                  <div style={{ margin: "7px 0 3px 0" }}>
                    Treffpunkt:{" "}
                    <span style={{ color: "#a3e635" }}>
                      {order.treffpunkt?.[0]?.toFixed(4)},
                      {order.treffpunkt?.[1]?.toFixed(4)}
                    </span>
                  </div>
                  {order.notiz && (
                    <div style={{ fontSize: 13, color: "#a1a1aa" }}>
                      Hinweis: {order.notiz}
                    </div>
                  )}
                  <div style={{ fontSize: 15, margin: "4px 0 6px 0" }}>
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
                  <div style={{ fontWeight: 600, color: "#22d3ee" }}>
                    Summe:{" "}
                    {order.warenkorb
                      .reduce((a, x) => {
                        const p = produkte.find((p) => p.id === x.produktId);
                        return a + (p ? p.preis * x.menge : 0);
                      }, 0)
                      .toFixed(2)}{" "}
                    €
                  </div>
                  <button
                    onClick={() =>
                      setOrders(orders.filter((o) => o.id !== order.id))
                    }
                    style={{
                      marginTop: 6,
                      background: "#f87171",
                      color: "#18181b",
                      border: 0,
                      borderRadius: 6,
                      fontWeight: 600,
                      padding: "3px 10px",
                    }}
                  >
                    Löschen
                  </button>
                  <Chat
                    chat={order.chat}
                    who="admin"
                    disabled={order.status === "abgeschlossen"}
                    sendMsg={(msg, setMsg) => {
                      sendOrderMsg(order.id, msg, "admin");
                      setMsg("");
                    }}
                  />
                </div>
              ))
            )}
          </div>
        )}

        <button
          onClick={() => setView("home")}
          style={{
            background: "#23262e",
            color: "#fff",
            padding: "10px 22px",
            borderRadius: 8,
            border: 0,
            fontSize: 16,
            fontWeight: 600,
            marginTop: 18,
          }}
        >
          Zurück
        </button>
      </div>
    );
  }
  // --- FALLBACK (sollte nie auftreten) ---
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#09090b",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 28 }}>
        Unbekannter Fehler 😬
      </h1>
      <div>Bitte die Seite neu laden oder den Code prüfen!</div>
      <button
        style={{
          marginTop: 16,
          background: "#38bdf8",
          color: "#18181b",
          padding: "10px 20px",
          borderRadius: 8,
          fontWeight: 700,
          border: 0,
        }}
        onClick={() => window.location.reload()}
      >
        Seite neu laden
      </button>
    </div>
  );
}
