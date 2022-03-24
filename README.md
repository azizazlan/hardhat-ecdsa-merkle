# hardhat-ecdsa-merkle

This is a hardhat/typescript version of a repo at https://github.com/OpenZeppelin/workshops/tree/master/06-nft-merkle-drop. So the contracts are direct copies of the original repo and here is the [blog](https://blog.openzeppelin.com/workshop-recap-building-an-nft-merkle-drop/)

I make no claim to originality. This repo is an attempt to recreate the hardhat task and test in typescript.
Why create another repo? This is how I learn. Re-type from scratch, understand the errors, fix them and in the process hopefully I could understand what is going on!

## Usage

1.  git clone this repo and change into the directory.
2.  npm install

### Run tests

1.  There are 3 tests and to test, run:
    1. `npx hardhat test test/ERC721LazyMint.test.ts`
    2. `npx hardhat test test/ERC721LazyMintWith712.test.ts`
    3. `npx hardhat test test/ERC721MerkleDrop.test.ts`

### Run tasks

There are 3 tasks: _deploy_, _sign_ and _redeem_. These tasks are related to `ERC721LazyMintWith712`.

1.  First, spin a local hardhat "blockchain" node:

    npx hardhat node

2.  Run _deploy_ task:

    npx hardhat deploy --network localhost

3.  Run _sign_ task:

    npx hardhat sign --network localhost --registry [registry_address] --account [token_owner_account] --tokenid 123

where the `registry_address` can be retrieved from the previous deploy task and any given accounts from local node can be used as `token_owner_address`

For example:

    npx hardhat sign --network localhost --registry 0x5FbDB2315678afecb367f032d93F642f64180aa3 --account 0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199 --tokenid 123

4. Run _redeem_ task:

```
npx hardhat redeem --registry 0x5FbDB2315678afecb367f032d93F642f64180aa3 --account 0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199 --tokenid 123 --signature 0x0939ab7502ffc7f4d7ace88c3d1bdc5f7d199b5975829cb85d70decd1316c7ff361a20e8cf4433572b8bd1176b178dbe8c4a581eec8370d16ce9849e0390b88d1b --network localhost
```

You might want to run the redeem task twice to see if the transaction got reverted!

## Todo

-   To create similar tasks (_deploy_, _proof_ and _redeem_) for `ERC721MerkleDrop`.

## Credits

https://github.com/OpenZeppelin/workshops/commits?author=Amxx
