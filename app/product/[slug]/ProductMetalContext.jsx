"use client";

import { createContext, useContext, useState } from "react";

// The metal switch sits in the details column and the gallery it drives sits
// in the image column, so the choice lives in a provider wrapping both.
const ProductMetalContext = createContext({ selectedKey: "", setSelectedKey: () => {} });

export function ProductMetalProvider({ initialKey = "", children }) {
  const [selectedKey, setSelectedKey] = useState(initialKey);

  return (
    <ProductMetalContext.Provider value={{ selectedKey, setSelectedKey }}>
      {children}
    </ProductMetalContext.Provider>
  );
}

export function useProductMetal() {
  return useContext(ProductMetalContext);
}

export function ProductMetalSelector({ metals }) {
  const { selectedKey, setSelectedKey } = useProductMetal();

  if (!metals || metals.length < 2) {
    return null;
  }

  const selectedLabel = metals.find((metal) => metal.key === selectedKey)?.label || metals[0].label;

  return (
    <fieldset className="product-metal-selector" data-product-metal-selector>
      <legend>
        Metal <span>{selectedLabel}</span>
      </legend>
      <div className="product-metal-options">
        {metals.map((metal) => (
          <button
            key={metal.key}
            type="button"
            className={`product-metal-option is-${metal.key}`}
            aria-pressed={metal.key === selectedKey}
            onClick={() => setSelectedKey(metal.key)}
          >
            <span className="product-metal-swatch" aria-hidden="true" />
            {metal.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
