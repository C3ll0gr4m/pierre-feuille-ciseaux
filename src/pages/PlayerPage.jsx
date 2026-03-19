import { ethers } from "ethers";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CHOIX_LABEL, NULL_ADDRESS } from "../constants/contract";
import { useAuth } from "../context/AuthContext";

const CHOIX = [{ label: "Pierre" }, { label: "Feuille" }, { label: "Ciseaux" }];

function shortAddr(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "—";
}

export default function PlayerPage() {
  const { address, contract, provider, logout } = useAuth();
  const navigate = useNavigate();

  const [selectedChoice, setSelectedChoice] = useState(null);
  const [betAmount, setBetAmount] = useState("");
  const [commissionRate, setCommissionRate] = useState(0);
  const [gameState, setGameState] = useState({
    p1: NULL_ADDRESS,
    p2: NULL_ADDRESS,
    mise: "0",
    miseRaw: null,
  });
  const [contractBalance, setContractBalance] = useState("—");
  const [log, setLog] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [userBalance, setUserBalance] = useState("—");

  const refreshUserBalance = useCallback(async () => {
    if (!provider || !address) return;
    try {
      const bal = await provider.getBalance(address);
      setUserBalance(parseFloat(ethers.utils.formatEther(bal)).toFixed(4));
    } catch (e) {}
  }, [provider, address]);

  const refreshState = useCallback(async () => {
    if (!contract) return;
    try {
      const [p1, p2, mise, solde, rate] = await Promise.all([
        contract.player1(),
        contract.player2(),
        contract.getMise(),
        contract.getSoldeContrat(),
        contract.commissionRate(),
      ]);
      const miseFormatted = ethers.utils.formatEther(mise);
      setGameState({ p1, p2, mise: miseFormatted, miseRaw: mise });
      setContractBalance(ethers.utils.formatEther(solde));
      setCommissionRate(Number(rate));

      if (
        p1 !== NULL_ADDRESS &&
        p2 === NULL_ADDRESS &&
        address.toLowerCase() !== p1.toLowerCase()
      ) {
        setBetAmount(miseFormatted);
      }
    } catch (e) {
      setLog("Erreur de lecture du contrat : " + e.message);
    }
  }, [contract, address]);

  const loadHistory = useCallback(async () => {
    if (!contract || !address) return;
    setLoadingHistory(true);
    try {
      const indices = await contract.getMesParties(address);
      const parties = await Promise.all(
        indices.map((i) => contract.getPartie(i)),
      );
      setHistory(
        parties.map((p, idx) => ({ ...p, id: Number(indices[idx]) })).reverse(),
      );
    } catch (e) {
      setLog("Erreur chargement historique : " + e.message);
    } finally {
      setLoadingHistory(false);
    }
  }, [contract, address]);

  useEffect(() => {
    if (!contract) return;
    refreshState();
    loadHistory();
    refreshUserBalance();

    const onPartieTerminee = (partieId, gagnant, gains) => {
      const eth = ethers.utils.formatEther(gains);
      const isWinner = gagnant.toLowerCase() === address.toLowerCase();
      setBanner({
        text: isWinner
          ? `Tu as gagné ! +${parseFloat(eth).toFixed(4)} ETH`
          : `Tu as perdu. Gagnant : ${shortAddr(gagnant)}`,
        type: isWinner ? "win" : "loss",
      });
      refreshState();
      loadHistory();
    };

    const onEgalite = () => {
      setBanner({ text: "Égalité ! Tu es remboursé.", type: "draw" });
      refreshState();
      loadHistory();
    };

    contract.on("PartieTerminee", onPartieTerminee);
    contract.on("Egalite", onEgalite);
    return () => {
      contract.off("PartieTerminee", onPartieTerminee);
      contract.off("Egalite", onEgalite);
    };
  }, [contract, address, refreshState, loadHistory, refreshUserBalance]);

  const isBetForced =
    gameState.p1 !== NULL_ADDRESS &&
    gameState.p2 === NULL_ADDRESS &&
    address.toLowerCase() !== gameState.p1.toLowerCase();

  async function rejoindre() {
    if (selectedChoice === null) {
      setLog("Choisis Pierre, Feuille ou Ciseaux.");
      return;
    }
    if (!betAmount || parseFloat(betAmount) <= 0) {
      setLog("Entre une mise valide.");
      return;
    }

    setLoading(true);
    setBanner(null);
    setLog("En attente de confirmation MetaMask...");
    try {
      const value = ethers.utils.parseEther(betAmount);
      const tx = await contract.rejoindre(selectedChoice, { value });
      setLog("Transaction envoyée, attente de confirmation...");
      await tx.wait();
      setLog(`Confirmée ! Hash : ${tx.hash.slice(0, 14)}...`);
      setSelectedChoice(null);
      if (!isBetForced) setBetAmount("");
      await refreshState();
    } catch (e) {
      setLog((e.reason || e.message || "Transaction annulée"));
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  // Commission
  const betNum = parseFloat(betAmount);
  const totalPot = betNum > 0 ? betNum * 2 : 0;
  const commission = (totalPot * commissionRate) / 100;
  const net = totalPot - commission;

  function renderStatus() {
    const { p1, p2, mise } = gameState;
    if (p1 === NULL_ADDRESS) {
      return "Aucune partie en cours. Sois le premier à rejoindre !";
    }
    if (p1 !== NULL_ADDRESS && p2 === NULL_ADDRESS) {
      const isMe = address.toLowerCase() === p1.toLowerCase();
      return (
        <>
          Joueur 1 <span className="tag tag-p1">{shortAddr(p1)}</span>
          {isMe && (
            <span
              style={{ color: "#4f46e5", fontSize: "0.78rem", marginLeft: 6 }}
            >
              (toi)
            </span>
          )}{" "}
          a rejoint.
          <br />
          Mise fixée : <strong>{mise} ETH</strong>
          <br />
          <br />En attente du joueur 2...
        </>
      );
    }
    return (
      <>
        Joueur 1 <span className="tag tag-p1">{shortAddr(p1)}</span> ✅<br />
        Joueur 2 <span className="tag tag-p2">{shortAddr(p2)}</span> ✅<br />
        Mise : <strong>{mise} ETH</strong> — Résolution en cours...
      </>
    );
  }

  function renderHistoryRow(partie, idx) {
    const isEgalite = partie.egalite;
    const isWinner =
      !isEgalite && partie.gagnant.toLowerCase() === address.toLowerCase();
    const isPlayer1 = partie.joueur1.toLowerCase() === address.toLowerCase();

    let resultTag, gainText;
    if (isEgalite) {
      resultTag = <span className="tag tag-draw">Égalité</span>;
      gainText = "±0";
    } else if (isWinner) {
      const g = parseFloat(ethers.utils.formatEther(partie.gains));
      const mise = parseFloat(ethers.utils.formatEther(partie.mise));
      resultTag = <span className="tag tag-win">Victoire</span>;
      gainText = (
        <span style={{ color: "#065f46", fontWeight: 600 }}>
          +{(g - mise).toFixed(4)} ETH
        </span>
      );
    } else {
      const mise = parseFloat(ethers.utils.formatEther(partie.mise));
      resultTag = <span className="tag tag-loss">Défaite</span>;
      gainText = (
        <span style={{ color: "#991b1b", fontWeight: 600 }}>
          −{mise.toFixed(4)} ETH
        </span>
      );
    }

    const adversaire = isPlayer1 ? partie.joueur2 : partie.joueur1;
    const monChoix = isPlayer1 ? partie.choixJoueur1 : partie.choixJoueur2;
    const date = new Date(Number(partie.timestamp) * 1000).toLocaleDateString(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

    return (
      <tr key={idx}>
        <td>#{partie.id}</td>
        <td>{date}</td>
        <td>{shortAddr(adversaire)}</td>
        <td>{CHOIX_LABEL[monChoix]}</td>
        <td>
          {parseFloat(ethers.utils.formatEther(partie.mise)).toFixed(4)} ETH
        </td>
        <td>{resultTag}</td>
        <td>{gainText}</td>
      </tr>
    );
  }

  // Calcul stats globales
  const stats = history.reduce(
    (acc, p) => {
      if (p.egalite) {
        acc.draws++;
        return acc;
      }
      const win = p.gagnant.toLowerCase() === address.toLowerCase();
      if (win) {
        acc.wins++;
        acc.totalGains +=
          parseFloat(ethers.utils.formatEther(p.gains)) -
          parseFloat(ethers.utils.formatEther(p.mise));
      } else {
        acc.losses++;
        acc.totalGains -= parseFloat(ethers.utils.formatEther(p.mise));
      }
      return acc;
    },
    { wins: 0, losses: 0, draws: 0, totalGains: 0 },
  );

  return (
    <>
      <nav className="navbar">
        <span className="navbar-brand">🎮 PFC — Joueur</span>
        <div className="navbar-right">
          <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
            Solde : <strong>{userBalance} ETH</strong>
          </span>
          <span className="wallet-badge">✅ {shortAddr(address)}</span>
          <button className="btn-danger" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </nav>

      <div className="page-wrapper">
        {banner && (
          <div
            className={`info-banner ${banner.type === "draw" ? "draw" : ""}`}
            style={
              banner.type === "loss"
                ? {
                    background: "#fef2f2",
                    borderColor: "#fca5a5",
                    color: "#991b1b",
                  }
                : {}
            }
          >
            {banner.text}
            <button
              onClick={() => setBanner(null)}
              style={{
                marginLeft: 16,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.8rem",
                opacity: 0.6,
              }}
            >
              ✕
            </button>
          </div>
        )}

        <div className="card">
          <h2>Rejoindre une partie</h2>

          <label>Ton choix</label>
          <div className="choices">
            {CHOIX.map((c, i) => (
              <button
                key={i}
                className={`choice-btn ${selectedChoice === i ? "selected" : ""}`}
                onClick={() => setSelectedChoice(i)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <label>
            Mise (en ETH)
            {isBetForced && (
              <span style={{ color: "#4f46e5", marginLeft: 6 }}>
                — fixée par le joueur 1
              </span>
            )}
          </label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => !isBetForced && setBetAmount(e.target.value)}
            placeholder="ex: 0.01"
            step="0.001"
            min="0"
            disabled={isBetForced}
          />

          {betNum > 0 && (
            <div className="commission-info">
              Commission plateforme ({commissionRate}%) :{" "}
              <strong>{commission.toFixed(6)} ETH</strong> → vous recevrez{" "}
              <strong>{net.toFixed(6)} ETH</strong> en cas de victoire
            </div>
          )}

          <button
            className="btn"
            onClick={rejoindre}
            disabled={loading || !contract}
          >
            {loading ? "En cours..." : "Rejoindre la partie"}
          </button>
        </div>

        <div className="card">
          <h2>État de la partie</h2>
          <div className="status-box">{renderStatus()}</div>
          <div className="info-row">
            <span>Solde du contrat</span>
            <span className="value">{contractBalance} ETH</span>
          </div>
          <button
            className="btn-outline"
            onClick={() => {
              refreshState();
              refreshUserBalance();
            }}
          >
            Rafraîchir
          </button>
        </div>

        {history.length > 0 && (
          <div className="card">
            <h2>Mes statistiques</h2>
            <div style={{ display: "flex", gap: 12 }}>
              {[
                { label: "Victoires", value: stats.wins, color: "#065f46" },
                { label: "Défaites", value: stats.losses, color: "#991b1b" },
                { label: "Égalités", value: stats.draws, color: "#1e40af" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    flex: 1,
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: "14px 10px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "1.4rem",
                      fontWeight: 700,
                      color: s.color,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "#6b7280",
                      marginTop: 2,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
              <div
                style={{
                  flex: 1,
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: "14px 10px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: stats.totalGains >= 0 ? "#065f46" : "#991b1b",
                  }}
                >
                  {stats.totalGains >= 0 ? "+" : ""}
                  {stats.totalGains.toFixed(4)}
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "#6b7280",
                    marginTop: 2,
                  }}
                >
                  ETH net
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Historique */}
        <div className="card">
          <h2>Historique de mes parties</h2>
          {loadingHistory ? (
            <p className="empty-state">Chargement...</p>
          ) : history.length === 0 ? (
            <p className="empty-state">Aucune partie jouée pour le moment.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Adversaire</th>
                    <th>Mon choix</th>
                    <th>Mise</th>
                    <th>Résultat</th>
                    <th>Gain/Perte</th>
                  </tr>
                </thead>
                <tbody>{history.map((p, i) => renderHistoryRow(p, i))}</tbody>
              </table>
            </div>
          )}
          <button
            className="btn-outline"
            onClick={loadHistory}
            style={{ marginTop: 14 }}
          >
            Actualiser l'historique
          </button>
        </div>

        {log && <p className="log-line">{log}</p>}
      </div>
    </>
  );
}
