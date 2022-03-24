import {ethers} from 'hardhat';
import {MerkleTree} from 'merkletreejs';
import {keccak256} from 'ethers/lib/utils';
import {expect} from 'chai';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import tokens from './tokens.json';
import {ERC721MerkleDrop} from '../typechain';

let accounts: SignerWithAddress[];
let registry: ERC721MerkleDrop;
let merkleTree: MerkleTree;

interface Network {
  chainId: number;
  name: string;
}
let network: Network;

interface Token {
  tokenId: string;
  account: string; // token owner address
  proof: string[];
}

async function deploy(merkleRoot: string) {
  const Contract = await ethers.getContractFactory('ERC721MerkleDrop');
  return await Contract.deploy('Name', 'Symbol', merkleRoot);
}

function hashToken(tokenId: string, account: string) {
  return Buffer.from(
    ethers.utils
      .solidityKeccak256(['uint256', 'address'], [tokenId, account])
      .slice(2),
    'hex',
  );
}

describe('ERC721MerkleDrop', () => {
  before(async () => {
    accounts = await ethers.getSigners();
    merkleTree = new MerkleTree(
      Object.entries(tokens).map((token) => hashToken(...token)),
      keccak256,
      {sortPairs: true},
    );
  });

  describe('Mint all elements', () => {
    before(async () => {
      registry = await deploy(merkleTree.getHexRoot());
    });

    for (const [tokenId, account] of Object.entries(tokens)) {
      it('element', async () => {
        /**
         * Create merkle proof (anyone with knowledge of the merkle tree)
         */
        const proof = merkleTree.getHexProof(hashToken(tokenId, account));
        await expect(registry.redeem(account, tokenId, proof))
          .to.emit(registry, 'Transfer')
          .withArgs(ethers.constants.AddressZero, account, tokenId);
      });
    }
  });

  describe('Duplicaste mint', () => {
    let token = {} as Token;

    before(async () => {
      registry = await deploy(merkleTree.getHexRoot());
      const t = Object.entries(tokens).find(Boolean);
      token.tokenId = t ? t[0] : '';
      token.account = t ? t[1] : '';

      const proof = merkleTree.getHexProof(
        hashToken(token.tokenId, token.account),
      );
      token.proof = proof;
    });

    it('first mint - ok', async () => {
      await expect(registry.redeem(token.account, token.tokenId, token.proof))
        .to.emit(registry, 'Transfer')
        .withArgs(ethers.constants.AddressZero, token.account, token.tokenId);
    });

    it('mint twice - reverted!', async () => {
      await expect(
        registry.redeem(token.account, token.tokenId, token.proof),
      ).to.revertedWith('ERC721: token already minted');
    });
  });

  describe('Frontrun', () => {
    let token = {} as Token;
    before(async () => {
      registry = await deploy(merkleTree.getHexRoot());
      const t = Object.entries(tokens).find(Boolean);
      token.tokenId = t ? t[0] : '';
      token.account = t ? t[1] : '';
      token.proof = merkleTree.getHexProof(
        hashToken(token.tokenId, token.account),
      );
    });
    it('reverted with wrong owner', async () => {
      await expect(
        registry.redeem(accounts[11].address, token.tokenId, token.proof),
      ).to.revertedWith('Invalid merkle proof');
    });
  });
});
