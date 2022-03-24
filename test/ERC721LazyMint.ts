import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {ethers} from 'hardhat';
import {ERC721LazyMint} from '../typechain';
import tokens from './tokens.json';

interface Token {
  id: string;
  owner: string | any;
  signature: string;
}

describe('ERC721LazyMint', function () {
  let registry: ERC721LazyMint;
  let accounts: SignerWithAddress[];
  let redeemer: SignerWithAddress;

  const deploy = async (tokenName: string, tokenSymbol: string) => {
    const ContractFactory = await ethers.getContractFactory('ERC721LazyMint');
    return await ContractFactory.deploy(tokenName, tokenSymbol);
  };

  const hashToken = (
    tokenId: string | unknown,
    ownerAddress: string | unknown,
  ) => {
    return Buffer.from(
      ethers.utils
        .solidityKeccak256(['uint256', 'address'], [tokenId, ownerAddress])
        .slice(2), // remove the '0x'
      'hex',
    );
  };

  before(async () => {
    accounts = await ethers.getSigners();
    redeemer = accounts[accounts.length - 1];
  });

  describe('Mint all elements', () => {
    before(async () => {
      registry = await deploy('Name', 'Symbol');
      // grant minter role to redeemer
      await registry.grantRole(await registry.MINTER_ROLE(), redeemer.address);
    });

    for (const [tokenId, tokenOwner] of Object.entries(tokens)) {
      it('element', async function () {
        const hashedToken = hashToken(tokenId, tokenOwner);
        const signature = await redeemer.signMessage(hashedToken);
        const tx = await registry
          .connect(redeemer)
          .redeem(`${tokenOwner}`, tokenId, signature);
        //emit Transfer(address(0), to, tokenId);
        expect(tx)
          .to.be.emit(registry, 'Transfer')
          .withArgs(ethers.constants.AddressZero, tokenOwner, tokenId);
      });
    }
  });

  describe('Duplicate mint', () => {
    let token = {} as Token; // the token we will try to duplicate
    before(async function () {
      registry = await deploy('Name', 'Symbol');
      // once grant, redeemer's signature has value!
      await registry.grantRole(await registry.MINTER_ROLE(), redeemer.address);

      const obj = Object.entries(tokens).find(Boolean);

      token.id = obj ? obj[0] : '';
      token.owner = obj ? obj[1] : '';

      token.signature = await redeemer.signMessage(
        hashToken(token.id, token.owner),
      );
    });
    it('mint once - success', async function () {
      const tx = await registry.redeem(token.owner, token.id, token.signature);
      expect(tx)
        .to.be.emit(registry, 'Transfer')
        .withArgs(ethers.constants.AddressZero, token.owner, token.id);
    });
    it('mint once - fail', async function () {
      // Refer github to get the right "reason" = "ERC721: token already minted"
      //https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/ERC721.sol
      await expect(
        registry.redeem(token.owner, token.id, token.signature),
      ).to.be.revertedWith('ERC721: token already minted');
    });
  });

  describe('Frontrun', () => {
    let token = {} as Token; // the token we will try to duplicate
    before(async function () {
      registry = await deploy('Name', 'Symbol');
      // once grant, redeemer's signature has value!
      await registry.grantRole(await registry.MINTER_ROLE(), redeemer.address);

      const obj = Object.entries(tokens).find(Boolean);

      token.id = obj ? obj[0] : '';
      token.owner = obj ? obj[1] : '';

      token.signature = await redeemer.signMessage(
        hashToken(token.id, token.owner),
      );
    });
    it('Try to redeem for different owner', async () => {
      await expect(
        registry.redeem(accounts[10].address, token.id, token.signature),
      ).to.revertedWith('Invalid signature');
    });
  });
});
