pragma solidity ^0.8.0;

contract PFS {

    enum PFSEnum { PIERRE, FEUILLE, CISEAUX }

    struct Partie {
        address joueur1;
        address joueur2;
        PFSEnum choixJoueur1;
        PFSEnum choixJoueur2;
        address gagnant;
        uint mise;
        uint gains;
        uint commission;
        uint timestamp;
        bool egalite;
    }

    address payable public player1;
    address payable public player2;
    PFSEnum public player1Choice;
    PFSEnum public player2Choice;
    uint public gamble;

    address payable public owner;
    uint8 public commissionRate;
    uint public totalCommissions;

    Partie[] public parties;
    mapping(address => uint[]) private partiesParJoueur;

    event PartieTerminee(
        uint indexed partieId,
        address indexed gagnant,
        uint gains,
        uint commission
    );
    event Egalite(uint indexed partieId, uint mise);

    constructor(uint8 _commissionRate) {
        require(_commissionRate <= 20, "Commission max 20%");
        owner = payable(msg.sender);
        commissionRate = _commissionRate;
    }

    function rejoindre(PFSEnum choix) public payable {
        require(msg.value > 0, "Tu dois miser quelque chose");
        require(msg.sender != player1, "Tu joues deja dans cette partie");

        if (player1 == address(0)) {
            player1 = payable(msg.sender);
            player1Choice = choix;
            gamble = msg.value;

        } else if (player2 == address(0)) {
            require(msg.value == gamble, "La mise doit etre identique a celle du joueur 1");
            player2 = payable(msg.sender);
            player2Choice = choix;
            _runGame();

        } else {
            revert("La partie est deja complete, attendez la fin");
        }
    }

    function _runGame() private {
        address payable gagnant;
        bool egalite = false;

        address payable _p1 = player1;
        address payable _p2 = player2;

        uint totalPot = address(this).balance;
        uint commission = 0;
        uint gains = 0;

        if (player1Choice == player2Choice) {
            egalite = true;

            uint partieIdEq = parties.length;
            Partie memory pEq = Partie({
                joueur1: _p1,
                joueur2: _p2,
                choixJoueur1: player1Choice,
                choixJoueur2: player2Choice,
                gagnant: address(0),
                mise: gamble,
                gains: 0,
                commission: 0,
                timestamp: block.timestamp,
                egalite: true
            });

            parties.push(pEq);
            partiesParJoueur[_p1].push(partieIdEq);
            partiesParJoueur[_p2].push(partieIdEq);

            uint remboursement = totalPot / 2;

            _reset();

            (bool ok1, ) = _p1.call{value: remboursement}("");
            (bool ok2, ) = _p2.call{value: remboursement}("");
            require(ok1 && ok2, "Remboursement echoue");

            emit Egalite(partieIdEq, remboursement);
            return;
        }

        if (
            (player1Choice == PFSEnum.PIERRE  && player2Choice == PFSEnum.CISEAUX) ||
            (player1Choice == PFSEnum.FEUILLE && player2Choice == PFSEnum.PIERRE)  ||
            (player1Choice == PFSEnum.CISEAUX && player2Choice == PFSEnum.FEUILLE)
        ) {
            gagnant = _p1;
        } else {
            gagnant = _p2;
        }

        commission = totalPot * commissionRate / 100;
        gains = totalPot - commission;

        uint partieId = parties.length;
        Partie memory nouvellePartie = Partie({
            joueur1: _p1,
            joueur2: _p2,
            choixJoueur1: player1Choice,
            choixJoueur2: player2Choice,
            gagnant: gagnant,
            mise: gamble,
            gains: gains,
            commission: commission,
            timestamp: block.timestamp,
            egalite: false
        });

        parties.push(nouvellePartie);
        partiesParJoueur[_p1].push(partieId);
        partiesParJoueur[_p2].push(partieId);

        _reset();

        totalCommissions += commission;

        (bool okOwner, ) = owner.call{value: commission}("");
        require(okOwner, "Envoi commission echoue");

        (bool success, ) = gagnant.call{value: gains}("");
        require(success, "Envoi des gains echoue");

        emit PartieTerminee(partieId, gagnant, gains, commission);
    }

    function _reset() private {
        player1 = payable(address(0));
        player2 = payable(address(0));
        gamble = 0;
    }

    function getToutesLesParties() public view returns (Partie[] memory) {
        require(msg.sender == owner, "Acces reserve a l'admin");
        return parties;
    }

    function getMesParties(address joueur) public view returns (uint[] memory) {
        return partiesParJoueur[joueur];
    }

    function getPartie(uint index) public view returns (Partie memory) {
        require(index < parties.length, "Index invalide");
        return parties[index];
    }

    function getNombreParties() public view returns (uint) {
        return parties.length;
    }

    function getTotalCommissions() public view returns (uint) {
        require(msg.sender == owner, "Acces reserve a l'admin");
        return totalCommissions;
    }

    function setCommissionRate(uint8 _newRate) public {
        require(msg.sender == owner, "Seul le owner peut modifier la commission");
        require(_newRate <= 20, "Commission max 20%");
        commissionRate = _newRate;
    }

    function isOwner(address addr) public view returns (bool) {
        return addr == owner;
    }

    function getSoldeContrat() public view returns (uint) {
        return address(this).balance;
    }

    function getMise() public view returns (uint) {
        return gamble;
    }
}
