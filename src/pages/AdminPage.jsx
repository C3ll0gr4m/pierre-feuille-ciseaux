import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useAuth } from '../context/AuthContext';
import { CHOIX_LABEL } from '../constants/contract';

function shortAddr(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';
}

export default function AdminPage() {
const { address, contract, provider, logout } = useAuth();
  const navigate = useNavigate();

  const [parties, setParties] = useState([]);
  const [totalCommissions, setTotalCommissions] = useState('—');
  const [contractBalance, setContractBalance] = useState('—');
  const [commissionRate, setCommissionRate] = useState(null);
  const [newRate, setNewRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [log, setLog] = useState('');
  const [userBalance, setUserBalance] = useState('—');

const refreshUserBalance = useCallback(async () => {
  if (!provider || !address) return;
  try {
    const bal = await provider.getBalance(address);
    setUserBalance(parseFloat(ethers.utils.formatEther(bal)).toFixed(4));
  } catch (e) {}
}, [provider, address]);


  const loadData = useCallback(async () => {
    if (!contract) return;
    setLoadingData(true);
    try {
      const [allParties, totalComm, solde, rate] = await Promise.all([
        contract.getToutesLesParties(),
        contract.getTotalCommissions(),
        contract.getSoldeContrat(),
        contract.commissionRate(),
      ]);
      setParties([...allParties].reverse());
      setTotalCommissions(parseFloat(ethers.utils.formatEther(totalComm)).toFixed(6));
      setContractBalance(parseFloat(ethers.utils.formatEther(solde)).toFixed(6));
      setCommissionRate(Number(rate));
    } catch (e) {
      setLog("Erreur chargement données : " + e.message);
    } finally {
      setLoadingData(false);
    }
  }, [contract]);

  useEffect(() => {
  loadData();
  refreshUserBalance();
}, [loadData, refreshUserBalance]);


  async function updateCommission() {
    const rate = parseInt(newRate);
    if (isNaN(rate) || rate < 0 || rate > 20) {
      setLog("Taux invalide (0–20).");
      return;
    }
    setLoading(true);
    setLog("En attente de confirmation MetaMask...");
    try {
      const tx = await contract.setCommissionRate(rate);
      await tx.wait();
      setLog(`Commission mise à jour à ${rate}%`);
      setCommissionRate(rate);
      setNewRate('');
    } catch (e) {
      setLog((e.reason || e.message));
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  // Stats globales
  const stats = parties.reduce((acc, p) => {
    acc.totalParties++;
    acc.totalMises += parseFloat(ethers.utils.formatEther(p.mise));
    acc.totalComm += parseFloat(ethers.utils.formatEther(p.commission));
    if (p.egalite) acc.egalites++;
    return acc;
  }, { totalParties: 0, totalMises: 0, totalComm: 0, egalites: 0 });

  function renderRow(partie, idx) {
    const date = new Date(Number(partie.timestamp) * 1000).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

    let resultatCell;
    if (partie.egalite) {
      resultatCell = <span className="tag tag-draw">Égalité</span>;
    } else {
      resultatCell = (
        <span title={partie.gagnant}>
          <span className="tag tag-win">{shortAddr(partie.gagnant)}</span>
        </span>
      );
    }

    return (
      <tr key={idx}>
        <td>#{parties.length - 1 - idx}</td>
        <td>{date}</td>
        <td>
          <span className="tag tag-p1">{shortAddr(partie.joueur1)}</span>
          <span style={{ margin: '0 4px', color: '#9ca3af' }}>vs</span>
          <span className="tag tag-p2">{shortAddr(partie.joueur2)}</span>
        </td>
        <td>
          {CHOIX_LABEL[partie.choixJoueur1]}
          <span style={{ margin: '0 4px', color: '#9ca3af' }}>vs</span>
          {CHOIX_LABEL[partie.choixJoueur2]}
        </td>
        <td>{parseFloat(ethers.utils.formatEther(partie.mise)).toFixed(4)} ETH</td>
        <td>{resultatCell}</td>
        <td>
          {partie.egalite
            ? <span style={{ color: '#9ca3af' }}>—</span>
            : <span style={{ color: '#5b21b6', fontWeight: 600 }}>
                {parseFloat(ethers.utils.formatEther(partie.commission)).toFixed(6)} ETH
              </span>
          }
        </td>
      </tr>
    );
  }

  return (
    <>
      <nav className="navbar">
  <span className="navbar-brand">PFC — Administrateur</span>
  <div className="navbar-right">
    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
      Solde : <strong>{userBalance} ETH</strong>
    </span>
    <span className="wallet-badge">{shortAddr(address)}</span>
    <button className="btn-danger" onClick={handleLogout}>Déconnexion</button>
  </div>
</nav>


      <div className="page-wrapper">

        <div className="card">
          <h2>Vue d'ensemble</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Parties jouées', value: stats.totalParties },
              { label: 'Égalités', value: stats.egalites },
              { label: 'Commissions totales', value: `${parseFloat(totalCommissions).toFixed(4)} ETH` },
              { label: 'Solde contrat', value: `${contractBalance} ETH` },
            ].map(s => (
              <div key={s.label} style={{
                flex: '1 1 120px', background: '#f9fafb', border: '1px solid #e5e7eb',
                borderRadius: 10, padding: '16px 12px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1a1a2e' }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Paramètres</h2>
          <div className="info-row" style={{ marginBottom: 14 }}>
            <span>Taux de commission actuel</span>
            <span className="value">{commissionRate !== null ? `${commissionRate}%` : '…'}</span>
          </div>
          <label>Nouveau taux (0–20 %)</label>
          <input
            type="number"
            value={newRate}
            onChange={e => setNewRate(e.target.value)}
            placeholder="ex: 5"
            min="0"
            max="20"
          />
          <button className="btn" onClick={updateCommission} disabled={loading || !newRate}>
            {loading ? "En cours..." : "Mettre à jour la commission"}
          </button>
          {log && <p className="log-line" style={{ marginTop: 10 }}>{log}</p>}
        </div>

        <div className="card" style={{ maxWidth: 860 }}>
          <h2>Historique de toutes les parties</h2>
          {loadingData ? (
            <p className="empty-state">Chargement...</p>
          ) : parties.length === 0 ? (
            <p className="empty-state">Aucune partie enregistrée.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Joueurs</th>
                    <th>Choix</th>
                    <th>Mise</th>
                    <th>Résultat</th>
                    <th>Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {parties.map((p, i) => renderRow(p, i))}
                </tbody>
              </table>
            </div>
          )}
          <button className="btn-outline" onClick={() => { loadData(); refreshUserBalance(); }} style={{ marginTop: 14 }}>
  Actualiser
</button>

        </div>

      </div>
    </>
  );
}
