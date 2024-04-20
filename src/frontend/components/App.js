import "./App.css";
import { ethers } from "ethers";
import { useState } from "react";

import MarketplaceAddress from "../contractsData/Marketplace-address.json";
import MarketplaceABI from "../contractsData/Marketplace.json";
import NFTAddress from "../contractsData/NFT-address.json";
import NFTABI from "../contractsData/NFT.json";

import Navigation from "./app/Navbar";
import {Home} from "./app/Home";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Spinner } from "react-bootstrap";

function App() {
  const [account, setAccount] = useState(null);
  const [marketplace, setMarketplace] = useState({});
  const [nft, setNFT] = useState({});
  const [loading, setLoading] = useState(true);

  const web3Handler = async () => {
    if (!window.ethereum) {
      window.alert("Please install MetaMask");
    }
    // prompt the user (via MetaMask) to connect their Ethereum wallet
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    setAccount(accounts[0]);
    const provider = new ethers.providers.Web3Provider(window.ethereum); // acts a bridge b/w MetaMask and blockchain
    const signer = provider.getSigner();

    loadContracts(signer);
  };
  const loadContracts = async (signer) => {
    // get deployed copies of contracts
    const marketplace = new ethers.Contract(
      MarketplaceAddress.address,
      MarketplaceABI.abi,
      signer
    );
    // console.log("marketplace ic:", marketplace.itemCount());
    setMarketplace(marketplace);
    const nft = new ethers.Contract(NFTAddress.address, NFTABI.abi, signer);
    // console.log("nft ic:",await nft.tokenCount());
    setNFT(nft);
    setLoading(false);
  };

  return (
    <>
      <BrowserRouter>
        <div className="App">
          <>
            <Navigation web3Handler={web3Handler} account={account} />
          </>
          <div>
            {loading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: "80vh",
                }}
              >
                <Spinner animation="border" style={{ display: "flex" }} />
                <p className="mx-3 my-0">Awaiting Metamask Connection...</p>
              </div>
            ) : (
              <Routes>
                <Route path="/" element={<Home marketplace={marketplace} nft={nft} />} />
                {/* <Route
                  path="/create"
                  element={<Create marketplace={marketplace} nft={nft} />}
                />
                <Route
                  path="/my-listed-items"
                  element={
                    <MyListedItems
                      marketplace={marketplace}
                      nft={nft}
                      account={account}
                    />
                  }
                />
                <Route
                  path="/my-purchases"
                  element={
                    <MyPurchases
                      marketplace={marketplace}
                      nft={nft}
                      account={account}
                    />
                  }
                /> */}
              </Routes>
            )}
          </div>
        </div>
      </BrowserRouter>
    </>
  );
}

export default App;
