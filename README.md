# Pierre Feuille Ciseaux by Jules Vic

Jeu Pierre/Feuille/Ciseaux utilisant un smart contract Ethereum. Les parties sont jouées en P2P avec une commission admin configurable (0-20%).

## Fonctionnalités

### Joueur

- Jouer des parties avec mise en ETH
- Historique complet de ses parties et gains/pertes
- Statistiques: victoires, défaites, égalités, P\&L net


### Admin

- Vue globale de toutes les parties jouées
- Suivi des commissions perçues
- Modification du taux de commission (0-20%)


### Transparence

- Toutes les parties et transactions visibles sur blockchain
- Résultats déterministes via smart contract
- Historique stocké on-chain


## Prérequis

```
Node.js 18+
Ganache (port 7545)
MetaMask
```


## Installation et Lancement

### 1. Cloner et Installer

```bash
git clone <ton-repo-url>
cd pfc-blockchain
npm install
```


### 2. Lancer Ganache

```
Ganache → Quickstart Ethereum (port 7545)
Copier l'adresse du 1er compte (admin)
```


### 3. Déployer le Smart Contract

```
Remix IDE:
1. Coller PFS.sol
2. Compiler (Solidity 0.8.0+)
3. Choisir le bon environnement
4. Deploy → Copier l'adresse
```


### 4. Configurer le Frontend

```
src/constants/contract.js:
CONTRACT_ADDRESS = "0xADRESSE_CONTRAT"
ADMIN_ADDRESS = "0xADRESSE_ADMIN"
```


### 5. Lancer

Se placer à la racine du projet

```bash
npm run dev
```

http://localhost:5173

## Utilisation

1. Connecter MetaMask → Choisir rôle (Joueur/Admin)
2. Joueur: Sélectionner choix + mise → "Rejoindre"
3. Admin: Vue globale + gestion commission

## Stack Technique

```
Frontend: React 18 + React Router + ethers.js
Backend: Smart Contract Solidity 0.8.0
Blockchain: Ganache / Ethereum
Wallet: MetaMask
```
