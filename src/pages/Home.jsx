import React from "react";
import Grid from "../components/Grid";
import { ItemModal } from "../components/Modal";

function HomePage() {
  return (
    <main className="auction-main">
      <div className="container">
        <Grid />
        <ItemModal />
      </div>
    </main>
  );
}

export default HomePage;
