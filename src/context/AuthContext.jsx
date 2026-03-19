import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, ABI, ADMIN_ADDRESS } from '../constants/contract';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [role, setRole] = useState(null); // 'player' | 'admin' | null
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
        if (accounts.length > 0) {
        }
      });
      window.ethereum.on('accountsChanged', () => logout());
    }
  }, []);

  async function connectWallet() {
    if (!window.ethereum) throw new Error("MetaMask non détecté");
    const _provider = new ethers.providers.Web3Provider(window.ethereum);
    await _provider.send("eth_requestAccounts", []);
    const _signer = _provider.getSigner();
    const _address = await _signer.getAddress();
    const _contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, _signer);

    setProvider(_provider);
    setSigner(_signer);
    setAddress(_address);
    setContract(_contract);

    return { address: _address, provider: _provider, signer: _signer, contract: _contract };
  }

  function loginAsRole(selectedRole, connectedAddress) {
    if (selectedRole === 'admin') {
      if (connectedAddress.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
        throw new Error("Cette adresse n'est pas autorisée à se connecter en tant qu'administrateur.");
      }
    }
    setRole(selectedRole);
  }

  function logout() {
    setAddress(null);
    setRole(null);
    setSigner(null);
    setContract(null);
    setProvider(null);
  }

  return (
    <AuthContext.Provider value={{ address, role, provider, signer, contract, connectWallet, loginAsRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
