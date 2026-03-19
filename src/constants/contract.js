export const CONTRACT_ADDRESS = "0x7d985E297b64C0F712214Fa1F2d20F04C46C3936";

export const ADMIN_ADDRESS = "0xC029C8369806ac9Ed23cA58cd6694821EE1c48Ca";
export const ABI = [
  "function rejoindre(uint8 choix) payable",
  "function getMise() view returns (uint256)",
  "function getSoldeContrat() view returns (uint256)",
  "function player1() view returns (address)",
  "function player2() view returns (address)",
  "function gamble() view returns (uint256)",
  "function commissionRate() view returns (uint8)",
  "function owner() view returns (address)",
  "function isOwner(address) view returns (bool)",
  "function getNombreParties() view returns (uint256)",
  "function getPartie(uint256) view returns (tuple(address joueur1, address joueur2, uint8 choixJoueur1, uint8 choixJoueur2, address gagnant, uint256 mise, uint256 gains, uint256 commission, uint256 timestamp, bool egalite))",
  "function getMesParties(address) view returns (uint256[])",
  "function getToutesLesParties() view returns (tuple(address joueur1, address joueur2, uint8 choixJoueur1, uint8 choixJoueur2, address gagnant, uint256 mise, uint256 gains, uint256 commission, uint256 timestamp, bool egalite)[])",
  "function getTotalCommissions() view returns (uint256)",
  "event PartieTerminee(uint256 indexed partieId, address indexed gagnant, uint256 gains, uint256 commission)",
  "event Egalite(uint256 indexed partieId, uint256 mise)",
];

export const CHOIX_LABEL = ["Pierre", "Feuille", "Ciseaux"];

export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
