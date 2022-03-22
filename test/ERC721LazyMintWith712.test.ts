import { ethers } from 'hardhat';
import { expect } from 'chai';
import tokens from './tokens.json';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ERC721LazyMintWith712 } from '../typechain';

let accounts: SignerWithAddress[];
let registry: ERC721LazyMintWith712;

interface Network {
    chainId: number;
    name: string;
}
let network: Network;

interface Token {
    tokenId: string;
    account: string; // token owner address
    signature: string;
}

async function deploy() {
    const Contract = await ethers.getContractFactory('ERC721LazyMintWith712');
    return await Contract.deploy('Name', 'Symbol');
}

describe('ERC721LazyMintWith712', () => {
    before(async () => {
        accounts = await ethers.getSigners();
        network = await ethers.provider.getNetwork();
    });

    describe('Mint all elements', () => {
        before(async () => {
            registry = await deploy();
            // make the signature of the first(index=0) account valuable
            // by granting the MINTER_ROLE
            await registry.grantRole(
                await registry.MINTER_ROLE(),
                accounts[0].address,
            );
        });

        for (const [tokenId, account] of Object.entries(tokens)) {
            it('element', async () => {
                const signature = await accounts[0]._signTypedData(
                    // domain
                    {
                        name: 'Name',
                        version: '1.0.0',
                        chainId: network.chainId,
                        verifyingContract: registry.address,
                    },
                    // type
                    {
                        NFT: [
                            { name: 'tokenId', type: 'uint256' },
                            { name: 'account', type: 'address' },
                        ],
                    },
                    //value
                    {
                        tokenId,
                        account,
                    },
                );
                await expect(registry.redeem(account, tokenId, signature))
                    .to.be.emit(registry, 'Transfer')
                    .withArgs(ethers.constants.AddressZero, account, tokenId);
            });
        }
    });

    describe('Duplicate mint', () => {
        let token = {} as Token;
        before(async () => {
            registry = await deploy();
            await registry.grantRole(
                await registry.MINTER_ROLE(),
                accounts[0].address,
            );
            const t = Object.entries(tokens).find(Boolean);
            token.tokenId = t ? t[0] : '';
            token.account = t ? t[1] : '';

            const signature = await accounts[0]._signTypedData(
                // Domain
                {
                    name: 'Name',
                    version: '1.0.0',
                    chainId: network.chainId,
                    verifyingContract: registry.address,
                },
                // Types
                {
                    NFT: [
                        { name: 'tokenId', type: 'uint256' },
                        { name: 'account', type: 'address' },
                    ],
                },
                // Value
                token,
            );
            token.signature = signature;
        });
        it('mint once - success', async () => {
            await expect(
                registry.redeem(token.account, token.tokenId, token.signature),
            )
                .to.be.emit(registry, 'Transfer')
                .withArgs(
                    ethers.constants.AddressZero,
                    token.account,
                    token.tokenId,
                );
        });
        it('mint twice - fail', async () => {
            await expect(
                registry.redeem(token.account, token.tokenId, token.signature),
            ).to.be.reverted;
        });
    });

    describe('Frontrun', () => {
        let token = {} as Token;

        before(async () => {
            registry = await deploy();
            await registry.grantRole(
                await registry.MINTER_ROLE(),
                accounts[0].address,
            );
            const t = Object.entries(tokens).find(Boolean);
            token.tokenId = t ? t[0] : '';
            token.account = t ? t[1] : '';

            const signature = await accounts[0]._signTypedData(
                // Domain
                {
                    name: 'Name',
                    version: '1.0.0',
                    chainId: network.chainId,
                    verifyingContract: registry.address,
                },
                // Types
                {
                    NFT: [
                        { name: 'tokenId', type: 'uint256' },
                        { name: 'account', type: 'address' },
                    ],
                },
                // Value
                token,
            );
            token.signature = signature;
        });

        it('using same signature and attempt to redeem for different owner', async () => {
            await expect(
                registry.redeem(
                    accounts[11].address, // try difference owner
                    token.tokenId,
                    token.signature,
                ),
            ).to.be.revertedWith('Invalid signature');
        });
    });
});
