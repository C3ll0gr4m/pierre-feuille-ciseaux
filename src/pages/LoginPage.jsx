import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { connectWallet, loginAsRole } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConnect() {
    if (!selectedRole) {
      setError("Choisis un rôle avant de continuer.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { address } = await connectWallet();
      loginAsRole(selectedRole, address);
      navigate(selectedRole === "admin" ? "/admin" : "/player");
    } catch (e) {
      setError(e.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="page-wrapper page-wrapper-login"
      style={{ justifyContent: "center", paddingTop: "80px" }}
    >
      <div className="page-header">
        <h1>Pierre Feuille Ciseaux</h1>
        <p>Jeu décentralisé sur Ethereum</p>
      </div>

      <div className="card login-card">
        <h2>Choisir un rôle</h2>

        <div className="role-buttons">
          <button
            className={`role-btn ${selectedRole === "player" ? "selected" : ""}`}
            onClick={() => {
              setSelectedRole("player");
              setError("");
            }}
          >
            <span className="role-label">Joueur</span>
            <span className="role-desc">Jouer des parties</span>
          </button>
          <button
            className={`role-btn ${selectedRole === "admin" ? "selected" : ""}`}
            onClick={() => {
              setSelectedRole("admin");
              setError("");
            }}
          >
            <span className="role-label">Administrateur</span>
            <span className="role-desc">Gérer la plateforme</span>
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        <button
          className="btn"
          onClick={handleConnect}
          disabled={loading || !selectedRole}
        >
          {loading ? "Connexion en cours..." : "Connecter MetaMask →"}
        </button>
      </div>
    </div>
  );
}
