import {task} from 'hardhat/config';

task('deploy', 'Deploy').setAction(async (taskArgs, hre) => {
  const {ethers} = hre;
  const [admin, minter, relayer] = await ethers.getSigners();
  console.log({
    admin: admin.address,
    minter: minter.address,
    relayer: relayer.address,
  });

  const contractFactory = await ethers.getContractFactory(
    'ERC721LazyMintWith712',
  );
  const registry = await contractFactory
    .connect(admin)
    .deploy('ERC721LazyMintWith712', 'Symbol');
  await registry.grantRole(await registry.MINTER_ROLE(), minter.address);
  console.log({address: registry.address, name: await registry.name()});
});

export default {};
