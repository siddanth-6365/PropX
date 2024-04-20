import React, { useState, useEffect } from "react";
import { Spinner } from "react-bootstrap";
import { Row, Col, Card, Button } from "react-bootstrap";
import { ethers } from "ethers";

export const Home = ({ marketplace, nft }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMarketplaceItems = async () => {
    console.log("called loadMarketplaceItems");
    try {
      const itemCount = await marketplace.itemCount();
      console.log("itemCount", itemCount);
      let tempitems = [];
      for (let i = 1; i <= itemCount; i++) {
        const item = await marketplace.items(i);
        if (!item.sold) {
          // get uri's url from nft contract
          const uri = await nft.tokenURI(item.tokenId);
          // get metadata from uri
          const res = await fetch(uri);
          const metadata = await res.json();
          const totalPrice = await marketplace.getTotalPrice(item.itemId);
          tempitems.push({
            totalPrice,
            itemId: item.itemId,
            seller: item.seller,
            name: metadata.name,
            description: metadata.description,
            image: metadata.image,
          });
        }
      }
      console.log(tempitems);
      setItems(tempitems);
      setLoading(false);
    } catch (error) {
      console.error("Error in loadMarketplaceItems", error);
    }
  };

  const buyMarketItem = async (item) => {
    await (
      await marketplace.purchaseItem(item.itemId, { value: item.totalPrice })
    ).wait();
    loadMarketplaceItems();
  };

  useEffect(() => {
    loadMarketplaceItems();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
        }}
      >
        <Spinner animation="border" style={{ display: "flex" }} />
        <p className="mx-3 my-0">loading Marketplace Items ...</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      {items.length > 0 ? (
        <div className="px-5 container">
          <Row xs={1} md={2} lg={4} className="g-4 py-5">
            {items.map((item, idx) => (
              <Col key={idx} className="overflow-hidden">
                <Card>
                  <Card.Img variant="top" src={item.image} />
                  <Card.Body color="secondary">
                    <Card.Title>{item.name}</Card.Title>
                    <Card.Text>{item.description}</Card.Text>
                  </Card.Body>
                  <Card.Footer>
                    <div className="d-grid">
                      <Button
                        onClick={() => buyMarketItem(item)}
                        variant="primary"
                        size="lg"
                      >
                        Buy for {ethers.utils.formatEther(item.totalPrice)} ETH
                      </Button>
                    </div>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ) : (
        <main style={{ padding: "1rem 0" }}>
          <h2>No listed assets</h2>
        </main>
      )}
    </div>
  );
};
