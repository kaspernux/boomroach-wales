#!/usr/bin/env python3
"""
Hydra Bot Trading Engine - Simplified BOOMROACH Integration
Advanced Solana trading system integrated with BoomRoach platform
"""
# file location ./boomroach/hydra-bot/trading-engine/main.py

import asyncio
import json
import os
import random
import time
import httpx
from datetime import datetime
from typing import Dict, Any, List

# Trading Engine Configuration
class HydraBotConfig:
    def __init__(self):
        self.BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")
        self.UPDATE_INTERVAL = int(os.getenv("UPDATE_INTERVAL", "5"))  # seconds
        self.ENGINES = [
            "sniper", "reentry", "ai-signals",
            "guardian", "scalper", "arbitrage"
        ]

config = HydraBotConfig()

# Trading Engine Classes
class TradingEngine:
    def __init__(self, engine_id: str, name: str):
        self.engine_id = engine_id
        self.name = name
        self.status = "STOPPED"
        self.metrics = {
            "successRate": "0.0%",
            "activeTrades": 0,
            "pendingOrders": 0,
            "dailyPnL": 0.0
        }
        self.running = False

    async def start(self):
        """Start the trading engine"""
        self.status = "RUNNING"
        self.running = True
        print(f"✅ {self.name} engine started")

        # Start trading loop
        await self.trading_loop()

    async def stop(self):
        """Stop the trading engine"""
        self.status = "STOPPED"
        self.running = False
        print(f"🛑 {self.name} engine stopped")

    async def trading_loop(self):
        """Main trading loop for this engine"""
        while self.running:
            try:
                # Simulate trading activity
                await self.analyze_market()
                await self.update_metrics()
                await asyncio.sleep(config.UPDATE_INTERVAL)
            except Exception as e:
                print(f"❌ Error in {self.name} trading loop: {e}")
                await asyncio.sleep(5)

    async def analyze_market(self):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{config.BACKEND_URL}/api/strategy/{self.engine_id}/signal")
                if response.status_code != 200:
                    print(f"⚠️ {self.name} HTTP {response.status_code}: {response.text}")
                    return
                data = response.json()
                if data.get("signal"):
                    await self.execute_trade(data)
        except Exception as e:
            print(f"⚠️ Market analysis failed for {self.name}: {e}")

    async def execute_trade(self, signal_data: Dict[str, Any]):
        try:
            async with httpx.AsyncClient() as client:
                trade_res = await client.post(f"{config.BACKEND_URL}/api/trade", json={
                    "engine": self.engine_id,
                    "symbol": signal_data.get("symbol"),
                    "action": signal_data.get("action"),
                    "confidence": signal_data.get("confidence")
                })
                if trade_res.status_code != 200:
                    print(f"❌ Trade HTTP {trade_res.status_code}: {trade_res.text}")
                    return
                result = trade_res.json()
                pnl = result.get("pnl", 0)
                self.metrics["dailyPnL"] += pnl
                print(f"💹 {self.name} executed {signal_data['action']} on {signal_data['symbol']} | P&L: {pnl:.2f}")
                self.metrics["activeTrades"] = result.get("activeTrades", 0)
                self.metrics["pendingOrders"] = result.get("pendingOrders", 0)
        except Exception as e:
            print(f"❌ Trade execution failed for {self.name}: {e}")

    async def update_metrics(self):
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(f"{config.BACKEND_URL}/api/engine/{self.engine_id}/metrics")
                if res.status_code != 200:
                    print(f"⚠️ Metrics HTTP {res.status_code}: {res.text}")
                    return
                data = res.json()
                self.metrics["successRate"] = data.get("successRate", "0.0%")
        except Exception as e:
            print(f"⚠️ Failed to update metrics for {self.name}: {e}")

class HydraBotManager:
    def __init__(self):
        self.engines = {}
        self.backend_connected = False

        # Initialize engines
        engine_configs = [
            ("sniper", "Sniper Engine"),
            ("reentry", "Re-entry Engine"),
            ("ai-signals", "AI Signals Engine"),
            ("guardian", "Guardian Engine"),
            ("scalper", "Scalper Engine"),
            ("arbitrage", "Arbitrage Engine")
        ]

        for engine_id, name in engine_configs:
            self.engines[engine_id] = TradingEngine(engine_id, name)

    async def start(self):
        print("🚀 Starting Hydra-Bot Trading Engine Manager...")
        tasks = [asyncio.create_task(e.start()) for e in self.engines.values()]
        tasks.append(asyncio.create_task(self.status_reporter()))
        print("✅ Hydra-Bot Manager started successfully")

        # Wait for tasks
        try:
            await asyncio.gather(*tasks)
        except KeyboardInterrupt:
            print("\n🛑 Shutdown signal received")
            await self.stop_all_engines()

    async def test_backend_connection(self):
        """Test connection to backend (réel)"""
        try:
            print("🔄 Testing backend connection...")
            async with httpx.AsyncClient() as client:
                res = await client.get(f"{config.BACKEND_URL}/health")
                if res.status_code == 200:
                    print("✅ Backend connection successful")
                    self.backend_connected = True
                else:
                    print(f"⚠️ Backend health HTTP {res.status_code}: {res.text}")
                    self.backend_connected = False
        except Exception as e:
            print(f"❌ Failed to connect to backend: {e}")
            self.backend_connected = False

    async def status_reporter(self):
        while True:
            try:
                status = {
                    "timestamp": datetime.now().isoformat(),
                    "engines": {
                        eid: {
                            "status": e.status,
                            "metrics": e.metrics
                        } for eid, e in self.engines.items()
                    }
                }
                async with httpx.AsyncClient() as client:
                    await client.post(f"{config.BACKEND_URL}/api/hydra/status", json=status)
                await asyncio.sleep(config.UPDATE_INTERVAL)
            except Exception as e:
                print(f"❌ Status reporting failed: {e}")
                await asyncio.sleep(5)

    async def send_status_update(self):
        """Send status update to backend"""
        try:
            status_data = {
                "timestamp": datetime.now().isoformat(),
                "engines": {}
            }

            for engine_id, engine in self.engines.items():
                status_data["engines"][engine_id] = {
                    "status": engine.status,
                    "metrics": engine.metrics
                }

            # Simulate sending to backend
            print(f"📊 Status update: {len([e for e in self.engines.values() if e.status == 'RUNNING'])} engines running")

        except Exception as e:
            print(f"❌ Failed to send status update: {e}")

    async def print_status(self):
        """Print status to console"""
        running_engines = [e for e in self.engines.values() if e.status == "RUNNING"]
        total_pnl = sum(e.metrics.get("dailyPnL", 0.0) for e in self.engines.values())
        print(f"📊 Hydra-Bot Status: {len(running_engines)}/{len(self.engines)} engines running | Total P&L: ${total_pnl:.2f}")

    async def stop_all_engines(self):
        for engine in self.engines.values():
            await engine.stop()

# Main execution
async def main():
    print("=" * 60)
    print("🪳 BoomRoach Hydra-Bot Trading Engine")
    print("=" * 60)

    manager = HydraBotManager()

    try:
        await manager.start()

    except KeyboardInterrupt:
        print("\n🛑 Shutdown signal received")
        await manager.stop_all_engines()
        print("👋 BOOMROACH Hydra-Bot shutdown complete")

    except Exception as e:
        print(f"❌ Fatal error: {e}")
        await manager.stop_all_engines()

if __name__ == "__main__":
    # Run the main function
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"❌ Startup error: {e}")
