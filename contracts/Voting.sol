// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {

    struct Voter {
        bool hasVoted;
        string votedFor;
    }

    mapping(address => Voter) public voters;
    mapping(string => uint) public votes;

    event VoteCast(address indexed voter, string indexed candidate, uint timestamp);

    constructor() {}

    function vote(string memory candidate) public returns (bool) {
        require(bytes(candidate).length > 0, "Invalid candidate");

        votes[candidate]++;
        
        emit VoteCast(msg.sender, candidate, block.timestamp);
        return true;
    }

    function getVotes(string memory candidate) public view returns (uint) {
        return votes[candidate];
    }

    function hasVoted(address voter) public view returns (bool) {
        return voters[voter].hasVoted;
    }

    function getVotedFor(address voter) public view returns (string memory) {
        return voters[voter].votedFor;
    }
}
