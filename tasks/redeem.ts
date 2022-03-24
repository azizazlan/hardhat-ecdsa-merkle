import {task} from 'hardhat/config';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
task('redeem', 'Redeem')
  .addParam('registry', 'Smart contract address')
  .addParam('tokenid', 'Token id')
  .addParam('account', 'Token owner address')
  .addParam('signature', 'Signature')
  .setAction(async (taskArgs, hre) => {
    const {network, ethers} = hre;
    const [admin, minter, relayer] = await ethers.getSigners();

    const registryAddr = taskArgs.registry;
    const tokenId = taskArgs.tokenid;
    const account = taskArgs.account;
    const signature = taskArgs.signature;

    const contractFactory = await ethers.getContractFactory(
      'ERC721LazyMintWith712',
    );
    const registry = contractFactory.attach(registryAddr);

    const tx = await registry.redeem(account, tokenId, signature);
    const receipt = await tx.wait();

    console.log(receipt);
  });

export default {};
