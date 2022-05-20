const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const toBN = (number) => {
    return ethers.BigNumber.from(number.toString());
}

const getProof = (signer) => {
    const leaf = keccak256(signer.address);

    const hexProof = merkleTree.getHexProof(leaf);

    return hexProof;
}

describe("Implementation", function () {
    before(async() => {
        this.Contract = await ethers.getContractFactory("Implementation");
        
        [owner, wl1, wl2, wl3, hacker] = await ethers.getSigners();

        // only wl1 and wl2 are whitelisted
        whitelistAddresses = [wl1.address, wl2.address, wl3.address];
        leafNodes = whitelistAddresses.map(addr => keccak256(addr));
        merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
        rootHash = merkleTree.getRoot();
        console.log('test merkle tree: ', merkleTree.toString('hex'));
    })

    beforeEach(async() => {
        contract = await this.Contract.deploy();
        await contract.deployed();

        wlPrice = await contract.PRE_PRICE();
        pubPrice = await contract.PUB_PRICE();
    })

    it("check constants", async function () {
        expect(await contract.MAX_SUPPLY()).to.equal(toBN(15));
        expect(await contract.PRE_MAX_SUPPLY()).to.equal(toBN(12));
    });

    it("pre-mint ~ reverted ~ with sale 0", async() => {
        await expect(contract.preMint(1, [])).to.be.revertedWith("presale is not open");
    })

    it("pre-mint ~ reverted ~ quantity exceeds max quantity per tx", async() => {
        // we don't want to get "presale is not open" error
        await contract.setSale(1);

        // quantity must be lower than PRE_MAX_NFT_PER_TRANSACTION
        await expect(contract.preMint(13, [])).to.be.revertedWith("quantity exceeds max quantity per tx");

        // it doesn't matter if user sends a number greater than 8 bits.
        // because EVM implicitly converts PRE_MAX_NFT_PER_TRANSACTION to uint256
        await expect(contract.preMint(130, [])).to.be.revertedWith("quantity exceeds max quantity per tx");
    })

    it("pre-mint ~ reverted ~ mint quantity exceeds max pre supply", async() => {
        // we don't want to get "presale is not open" error
        await contract.setSale(1);

        // that is why we set our MAX_SUPPLY and PRE_MAX_SUPPLY too low
        // we want to mint all of them, so, testing purposes
        await contract.connect(wl1).preMint(4, getProof(wl1), { value: wlPrice.mul(4)});
        await contract.connect(wl2).preMint(4, getProof(wl2), { value: wlPrice.mul(4)});
        await contract.connect(wl3).preMint(4, getProof(wl3), { value: wlPrice.mul(4)});

        await expect(contract.connect(wl2).preMint(1, getProof(wl2), { value: wlPrice}))
            .to.be.revertedWith("quantity exceeds max supply for presale");
    })

    it("pre-mint ~ reverted ~ mint quantity exceeds allocation", async() => {
        // we don't want to get "presale is not open" error
        await contract.setSale(1);

        await contract.connect(wl1).preMint(4, getProof(wl1), { value: wlPrice.mul(4)});
        await contract.connect(wl2).preMint(4, getProof(wl2), { value: wlPrice.mul(4)});

        await expect(contract.connect(wl1).preMint(1, getProof(wl1), { value: wlPrice }))
            .to.be.revertedWith("quantity exceeds max quantity per address");
    })

    it("pre-mint ~ reverted ~ user is not in the whitelist", async() => {
        // we don't want to get "presale is not open" error
        await contract.setSale(1);

        await expect(contract.connect(hacker).preMint(1, getProof(hacker), {value: wlPrice}))
            .to.be.revertedWith("invalid proof");
    })

    it("pre-mint ~ reverted ~ unsufficient value", async() => {
        // we don't want to get "presale is not open" error
        await contract.setSale(1);
        
        await expect(contract.connect(wl1).preMint(1, getProof(wl1), { value: 1 }))
            .to.be.revertedWith("unsufficient payment");
    })

    it("pre-mint ~ mint all pre-sale max supply", async() => {
        // we don't want to get "presale is not open" error
        await contract.setSale(1);

        // that is why we set our MAX_SUPPLY and PRE_MAX_SUPPLY too low
        // we want to mint all of them, so, testing purposes
        await contract.connect(wl1).preMint(4, getProof(wl1), { value: wlPrice.mul(4)});
        await contract.connect(wl2).preMint(4, getProof(wl2), { value: wlPrice.mul(4)});
        await contract.connect(wl3).preMint(4, getProof(wl3), { value: wlPrice.mul(4)});
    })

    it("public-mint ~ reverted ~ with sale 0", async() => {
        await expect(contract.publicMint(1, { value: pubPrice }))
            .to.be.revertedWith("public sale is not open");
    })

    it("public-mint ~ reverted ~ unsufficient payment", async() => {
        // we don't want to get "public sale is not open" error
        await contract.setSale(2);

        await expect(contract.publicMint(1, { value: 1 }))
            .to.be.revertedWith("unsufficient payment");
    })

    it("public-mint ~ reverted ~ quantity exceeds max quantity per tx", async() => {
        // we don't want to get "public sale is not open" error
        await contract.setSale(2);
        
        await expect(contract.publicMint(6, { value: pubPrice.mul(6)}))
            .to.be.revertedWith("quantity exceeds max quantity per tx");
    })

    it("public-mint ~ reverted ~ quantity exceeds max supply", async() => {
        // we don't want to get "public sale is not open" error
        await contract.setSale(2);
        
        await contract.connect(wl1).publicMint(5, { value: pubPrice.mul(5)});
        await contract.connect(wl2).publicMint(5, { value: pubPrice.mul(5)});
        await contract.connect(wl3).publicMint(5, { value: pubPrice.mul(5)});

        await expect(contract.publicMint(1, { value: pubPrice }))
            .to.be.revertedWith("quantity exceeds max supply")
    })

    it("public-mint ~ reverted ~ quantity exceeds max nft per address pub", async() => {
        // we don't want to get "public sale is not open" error
        await contract.setSale(2);

        await contract.publicMint(5, { value: pubPrice.mul(5)});
        await expect(contract.publicMint(1, { value: pubPrice }))
            .to.be.revertedWith("quantity exceeds max quantity per address");
    })

    it("integrated ~ mint all rights", async() => {
        await contract.setSale(1);
        await contract.connect(wl1).preMint(4, getProof(wl1), { value: wlPrice.mul(4) });

        await contract.setSale(2);
        await contract.connect(wl1).publicMint(5, { value: pubPrice.mul(5) });
    })

    it("integrated ~ reverted ~ mint all rights + 1", async() => {
        await contract.setSale(1);
        await contract.connect(wl1).preMint(4, getProof(wl1), { value: wlPrice.mul(4) });

        await contract.setSale(2);
        await contract.connect(wl1).publicMint(5, { value: pubPrice.mul(5) });

        await expect(contract.connect(wl1).publicMint(1, { value: pubPrice }))
            .to.be.revertedWith("quantity exceeds max quantity per address");
    })
});
