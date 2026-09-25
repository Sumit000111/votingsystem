const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');

const Phase = { Registration: 0, Voting: 1, Ended: 2 };
const id = (name) => ethers.id(name);
const voterKey = (label) => ethers.keccak256(ethers.toUtf8Bytes(`voter:${label}`));

describe('Voting', function () {
  async function deployFixture() {
    const [owner, outsider, nextOwner] = await ethers.getSigners();
    const Voting = await ethers.getContractFactory('Voting');
    const voting = await Voting.deploy('General Election 2026');
    return { voting, owner, outsider, nextOwner };
  }

  async function openElectionFixture() {
    const ctx = await deployFixture();
    await ctx.voting.addCandidates(['Alpha Party', 'Beta Party', 'Gamma Party'], ['ALP', 'BTP', 'GMP']);
    await ctx.voting.setPhase(Phase.Voting);
    return ctx;
  }

  describe('deployment', function () {
    it('sets owner, name and starts in Registration', async function () {
      const { voting, owner } = await loadFixture(deployFixture);
      expect(await voting.owner()).to.equal(owner.address);
      expect(await voting.electionName()).to.equal('General Election 2026');
      expect(await voting.phase()).to.equal(Phase.Registration);
      expect(await voting.totalVotes()).to.equal(0);
    });

    it('emits ElectionCreated', async function () {
      const Voting = await ethers.getContractFactory('Voting');
      const voting = await Voting.deploy('By-election');
      await expect(voting.deploymentTransaction())
        .to.emit(voting, 'ElectionCreated')
        .withArgs('By-election', (await ethers.getSigners())[0].address, anyValue);
    });

    it('rejects an empty election name', async function () {
      const Voting = await ethers.getContractFactory('Voting');
      await expect(Voting.deploy('')).to.be.revertedWithCustomError(Voting, 'InvalidInput');
    });
  });

  describe('candidates', function () {
    it('registers candidates keyed by keccak256(name)', async function () {
      const { voting } = await loadFixture(deployFixture);
      await expect(voting.addCandidate('Alpha Party', 'ALP'))
        .to.emit(voting, 'CandidateAdded')
        .withArgs(id('Alpha Party'), 'Alpha Party', 'ALP');

      expect(await voting.candidateCount()).to.equal(1);
      expect(await voting.isCandidate(id('Alpha Party'))).to.equal(true);
      const c = await voting.getCandidate(id('Alpha Party'));
      expect(c.name).to.equal('Alpha Party');
      expect(c.party).to.equal('ALP');
      expect(c.voteCount).to.equal(0);
      expect(c.active).to.equal(true);
    });

    it('batch registers and lists candidates', async function () {
      const { voting } = await loadFixture(deployFixture);
      await voting.addCandidates(['A', 'B'], ['a', 'b']);
      const all = await voting.getAllCandidates();
      expect(all.map((c) => c.name)).to.deep.equal(['A', 'B']);
    });

    it('rejects duplicates, empty names and mismatched batches', async function () {
      const { voting } = await loadFixture(deployFixture);
      await voting.addCandidate('A', 'a');
      await expect(voting.addCandidate('A', 'other'))
        .to.be.revertedWithCustomError(voting, 'CandidateExists')
        .withArgs(id('A'));
      await expect(voting.addCandidate('', 'x')).to.be.revertedWithCustomError(voting, 'InvalidInput');
      await expect(voting.addCandidates(['X'], [])).to.be.revertedWithCustomError(voting, 'InvalidInput');
    });

    it('only the owner can manage candidates', async function () {
      const { voting, outsider } = await loadFixture(deployFixture);
      await expect(voting.connect(outsider).addCandidate('A', 'a')).to.be.revertedWithCustomError(voting, 'NotOwner');
    });

    it('can deactivate and reactivate a candidate', async function () {
      const { voting } = await loadFixture(openElectionFixture);
      await expect(voting.setCandidateActive(id('Beta Party'), false))
        .to.emit(voting, 'CandidateStatusChanged')
        .withArgs(id('Beta Party'), false);
      await expect(voting.castVote(voterKey(1), id('Beta Party')))
        .to.be.revertedWithCustomError(voting, 'CandidateInactive')
        .withArgs(id('Beta Party'));
      await voting.setCandidateActive(id('Beta Party'), true);
      await expect(voting.castVote(voterKey(1), id('Beta Party'))).to.emit(voting, 'VoteCast');
    });

    it('reverts for unknown candidates', async function () {
      const { voting } = await loadFixture(deployFixture);
      await expect(voting.getCandidate(id('Nobody')))
        .to.be.revertedWithCustomError(voting, 'UnknownCandidate')
        .withArgs(id('Nobody'));
    });
  });

  describe('phases', function () {
    it('toggles Registration <-> Voting and emits PhaseChanged', async function () {
      const { voting } = await loadFixture(deployFixture);
      await expect(voting.setPhase(Phase.Voting))
        .to.emit(voting, 'PhaseChanged')
        .withArgs(Phase.Registration, Phase.Voting, anyValue);
      await voting.setPhase(Phase.Registration);
      expect(await voting.phase()).to.equal(Phase.Registration);
    });

    it('setting the same phase is a no-op', async function () {
      const { voting } = await loadFixture(deployFixture);
      await expect(voting.setPhase(Phase.Registration)).not.to.emit(voting, 'PhaseChanged');
    });

    it('Ended is terminal and freezes administration', async function () {
      const { voting } = await loadFixture(openElectionFixture);
      await voting.setPhase(Phase.Ended);
      await expect(voting.setPhase(Phase.Voting)).to.be.revertedWithCustomError(voting, 'ElectionEnded');
      await expect(voting.addCandidate('Late', 'L')).to.be.revertedWithCustomError(voting, 'ElectionEnded');
      await expect(voting.castVote(voterKey(1), id('Alpha Party')))
        .to.be.revertedWithCustomError(voting, 'WrongPhase')
        .withArgs(Phase.Voting, Phase.Ended);
    });

    it('only the owner can change phase', async function () {
      const { voting, outsider } = await loadFixture(deployFixture);
      await expect(voting.connect(outsider).setPhase(Phase.Voting)).to.be.revertedWithCustomError(voting, 'NotOwner');
    });
  });

  describe('voting', function () {
    it('records a vote, tallies it and emits VoteCast', async function () {
      const { voting } = await loadFixture(openElectionFixture);
      await expect(voting.castVote(voterKey(1), id('Alpha Party')))
        .to.emit(voting, 'VoteCast')
        .withArgs(voterKey(1), id('Alpha Party'), 'Alpha Party', 1, anyValue);

      expect(await voting.hasVoted(voterKey(1))).to.equal(true);
      expect(await voting.totalVotes()).to.equal(1);
      expect((await voting.getCandidate(id('Alpha Party'))).voteCount).to.equal(1);
    });

    it('prevents double voting on-chain', async function () {
      const { voting } = await loadFixture(openElectionFixture);
      await voting.castVote(voterKey(1), id('Alpha Party'));
      await expect(voting.castVote(voterKey(1), id('Beta Party')))
        .to.be.revertedWithCustomError(voting, 'AlreadyVoted')
        .withArgs(voterKey(1));
    });

    it('rejects votes outside the Voting phase', async function () {
      const { voting } = await loadFixture(deployFixture);
      await voting.addCandidate('A', 'a');
      await expect(voting.castVote(voterKey(1), id('A')))
        .to.be.revertedWithCustomError(voting, 'WrongPhase')
        .withArgs(Phase.Voting, Phase.Registration);
    });

    it('rejects unknown candidates and empty voter keys', async function () {
      const { voting } = await loadFixture(openElectionFixture);
      await expect(voting.castVote(voterKey(1), id('Nobody'))).to.be.revertedWithCustomError(
        voting,
        'UnknownCandidate'
      );
      await expect(voting.castVote(ethers.ZeroHash, id('Alpha Party'))).to.be.revertedWithCustomError(
        voting,
        'InvalidInput'
      );
    });

    it('only the relayer (owner) can submit ballots', async function () {
      const { voting, outsider } = await loadFixture(openElectionFixture);
      await expect(
        voting.connect(outsider).castVote(voterKey(1), id('Alpha Party'))
      ).to.be.revertedWithCustomError(voting, 'NotOwner');
    });

    it('keeps candidate tallies consistent with totalVotes', async function () {
      const { voting } = await loadFixture(openElectionFixture);
      const ballots = ['Alpha Party', 'Beta Party', 'Alpha Party', 'Gamma Party', 'Alpha Party'];
      for (const [i, name] of ballots.entries()) {
        await voting.castVote(voterKey(i), id(name));
      }
      const all = await voting.getAllCandidates();
      const tally = Object.fromEntries(all.map((c) => [c.name, Number(c.voteCount)]));
      expect(tally).to.deep.equal({ 'Alpha Party': 3, 'Beta Party': 1, 'Gamma Party': 1 });
      expect(await voting.totalVotes()).to.equal(ballots.length);
    });
  });

  describe('ownership', function () {
    it('transfers the relayer role', async function () {
      const { voting, owner, nextOwner } = await loadFixture(openElectionFixture);
      await expect(voting.transferOwnership(nextOwner.address))
        .to.emit(voting, 'OwnershipTransferred')
        .withArgs(owner.address, nextOwner.address);
      await expect(voting.castVote(voterKey(1), id('Alpha Party'))).to.be.revertedWithCustomError(
        voting,
        'NotOwner'
      );
      await expect(voting.connect(nextOwner).castVote(voterKey(1), id('Alpha Party'))).to.emit(voting, 'VoteCast');
    });

    it('rejects the zero address', async function () {
      const { voting } = await loadFixture(deployFixture);
      await expect(voting.transferOwnership(ethers.ZeroAddress)).to.be.revertedWithCustomError(voting, 'InvalidInput');
    });
  });
});
