"use client";

import { useEffect, useState } from "react";

// Structure des données de prix attendues depuis le backend temps réel
interface PriceData {
  price: number | null;
  marketCap: number | null;
  volume24h: number | null;
  priceChange24h: number | null;
  holders?: number | null;
  symbol?: string;
}

export function usePriceFeeds(tokenSymbol: string = "BOOMROACH") {
  const [priceData, setPriceData] = useState<PriceData>({
    price: null,
    marketCap: null,
    volume24h: null,
    priceChange24h: null,
    holders: null,
    symbol: tokenSymbol,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Connexion WebSocket au backend
    const wsUrl = process.env.NEXT_PUBLIC_REALTIME_WS_URL || "ws://localhost:3001";
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      // S'abonner uniquement aux prix
      socket.send(JSON.stringify({ type: "subscribe:prices", symbols: [tokenSymbol] }));
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "prices:update" && msg.data) {
          // msg.data doit être un objet { [symbol]: { ...PriceData } }
          const tokenData = msg.data[tokenSymbol];
          if (tokenData) {
            setPriceData({
              price: tokenData.price ?? null,
              marketCap: tokenData.marketCap ?? null,
              volume24h: tokenData.volume24h ?? null,
              priceChange24h: tokenData.change24h ?? null,
              holders: tokenData.holders ?? null,
              symbol: tokenSymbol,
            });
            setLoading(false);
            setError(null);
          }
        }
      } catch (e) {
        setError("Erreur de parsing des données temps réel");
      }
    };

    socket.onerror = () => {
      setError("Erreur WebSocket backend");
      setLoading(false);
    };

    socket.onclose = () => {
      setLoading(false);
    };

    return () => {
      socket.close();
    };
  }, [tokenSymbol]);

  return {
    priceData,
    loading,
    error,
    refetch: () => {}, // inutile ici, car flux temps réel
  };
}
