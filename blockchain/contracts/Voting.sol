// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Voting
 * @notice Tamper-evident ballot box for the National Voting System.
 *
 * The election authority (the backend relayer, `owner`) submits every vote on
 * behalf of an OTP-verified voter. Voter identities never touch the chain:
 * each voter is represented by an opaque `bytes32` key (an HMAC of the
 * off-chain voter hash), which is enough to enforce one vote per voter.
 *
 * Candidates are identified by `keccak256(bytes(name))`, which the backend
 * computes with `ethers.id(name)`.
 */
contract Voting {
    enum Phase {
        Registration, // candidates can be added, voting closed
        Voting, // ballots accepted
        Ended // terminal: results are final
    }

    struct Candidate {
        bytes32 id;
        string name;
        string party;
        uint256 voteCount;
        bool active;
    }

    address public owner;
    string public electionName;
    Phase public phase;
    uint256 public totalVotes;

    Candidate[] private _candidates;
    // candidate id => index in _candidates + 1 (0 means "not registered")
    mapping(bytes32 => uint256) private _candidateSlot;
    // voter key => has voted
    mapping(bytes32 => bool) public hasVoted;

    event ElectionCreated(string name, address indexed authority, uint256 timestamp);
    event CandidateAdded(bytes32 indexed candidateId, string name, string party);
    event CandidateStatusChanged(bytes32 indexed candidateId, bool active);
    event PhaseChanged(Phase previous, Phase current, uint256 timestamp);
    event VoteCast(
        bytes32 indexed voterKey,
        bytes32 indexed candidateId,
        string candidateName,
        uint256 totalVotes,
        uint256 timestamp
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error InvalidInput();
    error WrongPhase(Phase expected, Phase actual);
    error ElectionEnded();
    error CandidateExists(bytes32 candidateId);
    error UnknownCandidate(bytes32 candidateId);
    error CandidateInactive(bytes32 candidateId);
    error AlreadyVoted(bytes32 voterKey);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier notEnded() {
        if (phase == Phase.Ended) revert ElectionEnded();
        _;
    }

    constructor(string memory name_) {
        if (bytes(name_).length == 0) revert InvalidInput();
        owner = msg.sender;
        electionName = name_;
        phase = Phase.Registration;
        emit ElectionCreated(name_, msg.sender, block.timestamp);
    }

    // ------------------------------------------------------------------
    // Administration
    // ------------------------------------------------------------------

    function addCandidate(string calldata name, string calldata party) external onlyOwner notEnded {
        _addCandidate(name, party);
    }

    function addCandidates(string[] calldata names, string[] calldata parties) external onlyOwner notEnded {
        if (names.length == 0 || names.length != parties.length) revert InvalidInput();
        for (uint256 i = 0; i < names.length; i++) {
            _addCandidate(names[i], parties[i]);
        }
    }

    function setCandidateActive(bytes32 candidateId, bool active) external onlyOwner notEnded {
        Candidate storage c = _candidate(candidateId);
        if (c.active == active) return;
        c.active = active;
        emit CandidateStatusChanged(candidateId, active);
    }

    /**
     * @notice Move the election between phases. Registration <-> Voting can be
     * toggled (pause / resume); Ended is terminal and freezes the results.
     */
    function setPhase(Phase next) external onlyOwner notEnded {
        Phase previous = phase;
        if (previous == next) return;
        phase = next;
        emit PhaseChanged(previous, next, block.timestamp);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidInput();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ------------------------------------------------------------------
    // Voting
    // ------------------------------------------------------------------

    function castVote(bytes32 voterKey, bytes32 candidateId) external onlyOwner {
        if (phase != Phase.Voting) revert WrongPhase(Phase.Voting, phase);
        if (voterKey == bytes32(0)) revert InvalidInput();
        if (hasVoted[voterKey]) revert AlreadyVoted(voterKey);

        Candidate storage c = _candidate(candidateId);
        if (!c.active) revert CandidateInactive(candidateId);

        hasVoted[voterKey] = true;
        c.voteCount += 1;
        totalVotes += 1;

        emit VoteCast(voterKey, candidateId, c.name, totalVotes, block.timestamp);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    function candidateCount() external view returns (uint256) {
        return _candidates.length;
    }

    function isCandidate(bytes32 candidateId) external view returns (bool) {
        return _candidateSlot[candidateId] != 0;
    }

    function getCandidate(bytes32 candidateId) external view returns (Candidate memory) {
        return _candidate(candidateId);
    }

    function getAllCandidates() external view returns (Candidate[] memory) {
        return _candidates;
    }

    // ------------------------------------------------------------------
    // Internal
    // ------------------------------------------------------------------

    function _addCandidate(string calldata name, string calldata party) private {
        if (bytes(name).length == 0) revert InvalidInput();
        bytes32 id = keccak256(bytes(name));
        if (_candidateSlot[id] != 0) revert CandidateExists(id);

        _candidates.push(Candidate({ id: id, name: name, party: party, voteCount: 0, active: true }));
        _candidateSlot[id] = _candidates.length;
        emit CandidateAdded(id, name, party);
    }

    function _candidate(bytes32 candidateId) private view returns (Candidate storage) {
        uint256 slot = _candidateSlot[candidateId];
        if (slot == 0) revert UnknownCandidate(candidateId);
        return _candidates[slot - 1];
    }
}
