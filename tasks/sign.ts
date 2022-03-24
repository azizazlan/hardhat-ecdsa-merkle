import {task} from 'hardhat/config';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ERC721LazyMintWith712} from '../typechain';
task('sign', 'Sign')
  .addParam('registry', 'Smart contract address')
  .addParam('account', 'Token owner address')
  .addParam('tokenid', 'Token id')
  .setAction(async (taskArgs, hre) => {
    const {ethers} = hre;
    const [admin, minter, relayer] = await ethers.getSigners();

    const registryAddr = taskArgs.registry;
    const account = taskArgs.account;
    const tokenId = taskArgs.tokenid;

    const {chainId} = await ethers.provider.getNetwork();

    const signature = await minter._signTypedData(
      // Domain
      {
        name: 'ERC721LazyMintWith712',
        version: '1.0.0',
        chainId,
        verifyingContract: registryAddr,
      },
      // Types
      {
        NFT: [
          {name: 'tokenId', type: 'uint256'},
          {name: 'account', type: 'address'},
        ],
      },
      // Value
      {tokenId, account},
    );
    console.log({
      registry: registryAddr,
      account: account,
      tokenId: tokenId,
      signature: signature,
    });
  });

export default {};
