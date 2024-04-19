const { expect } = require("chai");

const toWei = (num) => ethers.utils.parseEther(num.toString());
const fromWei = (num) => ethers.utils.formatEther(num);
// Wei: This is the smallest denomination of Ether. 1 Ether is equivalent to 10^18 Wei

describe("NFTMarketplace", function () {
  let NFT,
    Marketplace,
    deployer,
    addr1,
    addr2,
    addrs,
    nft,
    marketplace,
    URI = "https://gateway.pinata.cloud/ipfs/QmZz1Q5",
    feePercent = 2;

  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    NFT = await ethers.getContractFactory("NFT");
    Marketplace = await ethers.getContractFactory("Marketplace");
    [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();
    // console.log("Deployer :", deployer);

    // To deploy our contracts
    nft = await NFT.deploy();
    marketplace = await Marketplace.deploy(feePercent);
  });

  describe("Deployment", function () {
    it("Should track name and symbol of the nft collection", async function () {
      expect(await nft.name()).to.equal("App NFT");
      expect(await nft.symbol()).to.equal("App");
    });
    it("Should track feeAccount and feePercent of the marketplace", async function () {
      expect(await marketplace.feeAccount()).to.equal(deployer.address);
      expect(await marketplace.feePercent()).to.equal(feePercent);
    });
  });

  describe("Miniting NFTs", function () {
    it("Should mint NFTs", async function () {
      // deployer mints an nft
      await nft.connect(addr1).mint(URI);
      expect(await nft.tokenCount()).to.equal(1);
      expect(await nft.balanceOf(addr1.address)).to.equal(1);
      expect(await nft.tokenURI(1)).to.equal(URI);
      // addr2 mints an nft
      await nft.connect(addr2).mint(URI);
      expect(await nft.tokenCount()).to.equal(2);
      expect(await nft.balanceOf(addr2.address)).to.equal(1);
      expect(await nft.tokenURI(2)).to.equal(URI);
    });
  });

  describe("making/creating an nft", function () {
    let price = 1;
    beforeEach(async function () {
      // addr1 mints an nft
      await nft.connect(addr1).mint(URI);
      // addr1 approves marketplace to spend nft,since we have transferFrom function in marketplace
      await nft.connect(addr1).setApprovalForAll(marketplace.address, true);
    });

    it("Should track newly created item, transfer NFT from seller to marketplace and emit Offered event", async function () {
      // addr1 offers their nft at a price of 1 ether
      await expect(
        marketplace.connect(addr1).makeItem(nft.address, 1, toWei(price))
      )
        .to.emit(marketplace, "Offered")
        .withArgs(1, nft.address, 1, toWei(price), addr1.address);

      // Owner of NFT should now be the marketplace
      expect(await nft.ownerOf(1)).to.equal(marketplace.address);
      // Item count should now equal 1
      expect(await marketplace.itemCount()).to.equal(1);
      // Get item from items mapping then check fields to ensure they are correct
      const item = await marketplace.items(1);
      expect(item.itemId).to.equal(1);
      expect(item.nft).to.equal(nft.address);
      expect(item.tokenId).to.equal(1);
      expect(item.price).to.equal(toWei(price));
      expect(item.sold).to.equal(false);
    });
    it("Should fail if price is set to zero", async function () {
      await expect(
        marketplace.connect(addr1).makeItem(nft.address, 1, 0)
      ).to.be.revertedWith("price need to greater than 0");
    });
  });

  describe("Purchasing marketplace items", function () {
    let price = 2;
    let fee = (feePercent / 100) * price;
    let totalPriceInWei;
    beforeEach(async function () {
      await nft.connect(addr1).mint(URI);
      await nft.connect(addr1).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(addr1).makeItem(nft.address, 1, toWei(price));
    });

    it("Should update item as sold, pay seller, transfer NFT to buyer, charge fees and emit a Bought event", async function () {
      const sellerInitalEthBal = await addr1.getBalance();
      const feeAccountInitialEthBal = await deployer.getBalance();
      // fetch items total price (market fees + item price)
      totalPriceInWei = await marketplace.getTotalPrice(1);
      // addr 2 purchases item.
      await expect(
        marketplace.connect(addr2).purchaseItem(1, { value: totalPriceInWei })
      )
        .to.emit(marketplace, "Bought")
        .withArgs(
          1,
          nft.address,
          1,
          toWei(price),
          addr1.address,
          addr2.address
        );
      const sellerFinalEthBal = await addr1.getBalance();
      const feeAccountFinalEthBal = await deployer.getBalance();
      // Item should be marked as sold
      expect((await marketplace.items(1)).sold).to.equal(true);
      // Seller should receive payment for the price of the NFT sold.
      expect(+fromWei(sellerFinalEthBal)).to.equal(
        +price + +fromWei(sellerInitalEthBal)
      );
      // feeAccount should receive fee
      expect(+fromWei(feeAccountFinalEthBal)).to.equal(
        +fee + +fromWei(feeAccountInitialEthBal)
      );
      // The buyer should now own the nft
      expect(await nft.ownerOf(1)).to.equal(addr2.address);
    });

    it("Should fail for invalid item ids, sold items and when not enough ether is paid", async function () {
      // fails for invalid item ids
      await expect(
        marketplace.connect(addr2).purchaseItem(2, { value: totalPriceInWei })
      ).to.be.revertedWith("item doesn't exist");
      await expect(
        marketplace.connect(addr2).purchaseItem(0, { value: totalPriceInWei })
      ).to.be.revertedWith("item doesn't exist");
      // Fails when not enough ether is paid with the transaction.
      // In this instance, fails when buyer only sends enough ether to cover the price of the nft
      // not the additional market fee.
      await expect(
        marketplace.connect(addr2).purchaseItem(1, { value: toWei(price) })
      ).to.be.revertedWith(
        "not enough ether to cover item price and market fee"
      );
      // addr2 purchases item 1
      await marketplace
        .connect(addr2)
        .purchaseItem(1, { value: totalPriceInWei });
      // addr3 tries purchasing item 1 after its been sold
      const addr3 = addrs[0];
      await expect(
        marketplace.connect(addr3).purchaseItem(1, { value: totalPriceInWei })
      ).to.be.revertedWith("item already sold");
    });
  });
});
