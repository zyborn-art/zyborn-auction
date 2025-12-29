import React, { useContext } from "react";
import { Item } from "./Item";
import { ItemsContext } from "../contexts/ItemsContext";

const Grid = () => {
  const { items } = useContext(ItemsContext);

  return (
    <div className="auction-grid">
      {items.map((item) => {
        return <Item key={item.id} item={item} />;
      })}
    </div>
  );
};

export default Grid;
