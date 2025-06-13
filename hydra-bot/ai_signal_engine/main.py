"""
Hydra Bot AI Signal Engine
Advanced token analysis using OpenAI GPT-4, sentiment analysis, and technical indicators
"""

import asyncio
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

import openai
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, BackgroundTasks
from loguru import logger
import httpx
from sqlalchemy import select
import ta
from textblob import TextBlob

from config.settings import get_settings
from core.database import Database
from core.redis_client import RedisClient
from models.signal import Signal, SignalType, SignalAction, SignalEngine
from services.social_monitor import SocialMonitorService
from services.technical_analyzer import TechnicalAnalyzer
from utils.token_analyzer import TokenAnalyzer

settings = get_settings()

# Vérification explicite des URLs de connexion DB/Redis au démarrage
if not getattr(settings, "DATABASE_URL", None):
    logger.error("DATABASE_URL manquant dans les variables d'environnement !")
    raise RuntimeError("DATABASE_URL non défini")
if not getattr(settings, "REDIS_URL", None):
    logger.error("REDIS_URL manquant dans les variables d'environnement !")
    raise RuntimeError("REDIS_URL non défini")
if not getattr(settings, "OPENAI_API_KEY", None):
    logger.error("OPENAI_API_KEY manquant dans les variables d'environnement !")
    raise RuntimeError("OPENAI_API_KEY non défini")

class SignalConfidence(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"

@dataclass
class TokenAnalysis:
    """Comprehensive token analysis result"""
    token_mint: str
    symbol: str
    price: float
    market_cap: float
    volume_24h: float
    
    # Technical analysis
    rsi: float
    macd_signal: str
    bollinger_position: float
    volume_profile: str
    support_resistance: Dict[str, float]
    
    # Sentiment analysis
    social_sentiment: float
    news_sentiment: float
    community_activity: int
    influencer_mentions: int
    
    # AI analysis
    ai_recommendation: SignalAction
    ai_confidence: float
    ai_reasoning: str
    target_price: Optional[float]
    stop_loss: Optional[float]
    time_horizon: str
    
    # Risk factors
    risk_score: float
    liquidity_risk: float
    volatility_risk: float
    smart_money_activity: float

class AISignalEngine:
    """AI-powered signal generation engine"""
    
    def __init__(self):
        self.openai_client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.database = None
        self.redis_client = None
        self.social_monitor = None
        self.technical_analyzer = None
        self.token_analyzer = None
        self.is_running = False
        
    async def initialize(self):
        """Initialize all services and connections"""
        logger.info("🤖 Initializing AI Signal Engine...")
        
        # Database connection
        self.database = Database(settings.DATABASE_URL)
        await self.database.connect()
        
        # Redis connection
        self.redis_client = RedisClient(settings.REDIS_URL)
        await self.redis_client.connect()
        
        # Initialize analyzers
        self.social_monitor = SocialMonitorService()
        self.technical_analyzer = TechnicalAnalyzer()
        self.token_analyzer = TokenAnalyzer()
        
        logger.info("✅ AI Signal Engine initialized")
    
    async def test_backend_connection(self):
        """Test réel de connexion HTTP au backend"""
        backend_url = os.getenv("BACKEND_URL", "http://localhost:3001")
        try:
            async with httpx.AsyncClient() as client:
                # Test /api/strategy/{engine_id}/signal
                test_engine = "ai-signals"
                sig_resp = await client.get(f"{backend_url}/api/strategy/{test_engine}/signal")
                if sig_resp.status_code != 200:
                    logger.error(f"❌ /api/strategy/{test_engine}/signal HTTP {sig_resp.status_code}: {sig_resp.text}")
                else:
                    logger.info(f"✅ /api/strategy/{test_engine}/signal OK")

                # Test /api/trade
                trade_resp = await client.post(f"{backend_url}/api/trade", json={
                    "engine": test_engine,
                    "symbol": "TEST",
                    "action": "BUY",
                    "confidence": 0.5
                })
                if trade_resp.status_code != 200:
                    logger.error(f"❌ /api/trade HTTP {trade_resp.status_code}: {trade_resp.text}")
                else:
                    logger.info(f"✅ /api/trade OK")
        except Exception as e:
            logger.error(f"Backend connection test failed: {e}")

    async def generate_signal(self, analysis: TokenAnalysis) -> Optional[Signal]:
        """Génère un signal à partir de l'analyse complète"""
        try:
            # ...votre logique de génération de signal...
            # Exemple fictif :
            return Signal(
                token_mint=analysis.token_mint,
                engine=SignalEngine.AI,
                type=SignalType.SPOT,
                action=analysis.ai_recommendation,
                confidence=analysis.ai_confidence,
                price=analysis.price,
                target_price=analysis.target_price,
                stop_loss=analysis.stop_loss,
                timeframe=analysis.time_horizon,
                reasoning=analysis.ai_reasoning,
                metadata={},
                status="ACTIVE",
                created_at=datetime.utcnow()
            )
        except Exception as e:
            logger.error(f"Signal generation failed: {e} | Analysis: {analysis}")
            return None

    async def get_tokens_to_analyze(self) -> List[Dict[str, Any]]:
        """Récupère la liste des tokens à analyser (exemple simplifié)"""
        # À adapter selon votre logique réelle
        return [
            {"mint": "So11111111111111111111111111111111111111112", "symbol": "SOL"},
            # ...autres tokens...
        ]

    async def start_signal_generation(self):
        """Start the main signal generation loop"""
        if self.is_running:
            return

        self.is_running = True
        logger.info("🎯 Starting AI signal generation...")

        # Test HTTP endpoints avant de démarrer la boucle
        await self.test_backend_connection()

        while self.is_running:
            try:
                tokens = await self.get_tokens_to_analyze()
                for token in tokens:
                    try:
                        analysis = await self.analyze_token(token)
                        signal = await self.generate_signal(analysis)
                        if signal:
                            await self.save_signal(signal)
                            await self.broadcast_signal(signal)
                    except Exception as e:
                        logger.error(f"Error analyzing token {token.get('symbol', 'Unknown')}: {e}")
                await asyncio.sleep(60)
            except Exception as e:
                logger.error(f"Error in signal generation loop: {e}")
                await asyncio.sleep(30)

    async def analyze_token(self, token: Dict[str, Any]) -> TokenAnalysis:
        """Perform comprehensive token analysis"""
        logger.info(f"🔍 Analyzing token: {token['symbol']}")
        
        # Get price and market data
        price_data = await self.get_price_data(token['mint'])
        
        # Technical analysis
        technical_data = await self.technical_analyzer.analyze(
            token['mint'], 
            timeframe='1h'
        )
        
        # Social sentiment analysis
        social_data = await self.social_monitor.get_sentiment(token['symbol'])
        
        # AI-powered analysis
        ai_analysis = await self.get_ai_analysis(token, price_data, technical_data, social_data)
        
        return TokenAnalysis(
            token_mint=token['mint'],
            symbol=token['symbol'],
            price=price_data['price'],
            market_cap=price_data.get('market_cap', 0),
            volume_24h=price_data.get('volume_24h', 0),
            
            # Technical indicators
            rsi=technical_data['rsi'],
            macd_signal=technical_data['macd_signal'],
            bollinger_position=technical_data['bollinger_position'],
            volume_profile=technical_data['volume_profile'],
            support_resistance=technical_data['support_resistance'],
            
            # Sentiment data
            social_sentiment=social_data['sentiment_score'],
            news_sentiment=social_data['news_sentiment'],
            community_activity=social_data['activity_score'],
            influencer_mentions=social_data['influencer_mentions'],
            
            # AI analysis
            ai_recommendation=SignalAction(ai_analysis['recommendation']),
            ai_confidence=ai_analysis['confidence'],
            ai_reasoning=ai_analysis['reasoning'],
            target_price=ai_analysis.get('target_price'),
            stop_loss=ai_analysis.get('stop_loss'),
            time_horizon=ai_analysis['time_horizon'],
            
            # Risk assessment
            risk_score=ai_analysis['risk_score'],
            liquidity_risk=technical_data['liquidity_risk'],
            volatility_risk=technical_data['volatility_risk'],
            smart_money_activity=social_data['smart_money_activity']
        )
    
    async def save_signal(self, signal: Signal):
        """Save signal to database"""
        try:
            async with self.database.get_session() as session:
                # Convert signal to database record
                signal_record = {
                    'token_mint': signal.token_mint,
                    'engine': signal.engine.value,
                    'type': signal.type.value,
                    'action': signal.action.value,
                    'confidence': signal.confidence,
                    'price': signal.price,
                    'target_price': signal.target_price,
                    'stop_loss': signal.stop_loss,
                    'timeframe': signal.timeframe,
                    'reasoning': json.dumps(signal.reasoning),
                    'metadata': json.dumps(signal.metadata),
                    'status': 'ACTIVE',
                    'created_at': datetime.utcnow()
                }
                # Correction : requête SQL explicite avec colonnes
                query = """
                INSERT INTO signals (
                    token_mint, engine, type, action, confidence, price, target_price, stop_loss,
                    timeframe, reasoning, metadata, status, created_at
                ) VALUES (
                    :token_mint, :engine, :type, :action, :confidence, :price, :target_price, :stop_loss,
                    :timeframe, :reasoning, :metadata, :status, :created_at
                )
                """
                await session.execute(query, signal_record)
                await session.commit()
            logger.info(f"💾 Saved signal for {signal.token_mint}")
        except Exception as e:
            logger.error(f"Error saving signal: {e} | Data: {signal_record}")
    
    async def broadcast_signal(self, signal: Signal):
        """Broadcast signal to Redis for real-time distribution"""
        try:
            signal_data = {
                'token_mint': signal.token_mint,
                'type': signal.type.value,
                'action': signal.action.value,
                'confidence': signal.confidence,
                'price': signal.price,
                'target_price': signal.target_price,
                'stop_loss': signal.stop_loss,
                'reasoning': signal.reasoning,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Publish to Redis channel
            await self.redis_client.publish(
                'trading_signals',
                json.dumps(signal_data)
            )
            
            logger.info(f"📡 Broadcasted signal for {signal.token_mint}")
            
        except Exception as e:
            logger.error(f"Error broadcasting signal: {e}")
    
    async def stop(self):
        """Stop the signal generation engine"""
        self.is_running = False
        logger.info("🛑 AI Signal Engine stopped")

# FastAPI app for AI Signal Engine
app = FastAPI(title="Hydra Bot AI Signal Engine", version="1.0.0")

engine = AISignalEngine()

@app.on_event("startup")
async def startup():
    try:
        await engine.initialize()
        asyncio.create_task(engine.start_signal_generation())
    except Exception as e:
        logger.error(f"Startup failed: {e}")
        raise

@app.on_event("shutdown")
async def shutdown():
    try:
        await engine.stop()
    except Exception as e:
        logger.error(f"Shutdown failed: {e}")

@app.get("/")
async def root():
    return {
        "name": "Hydra Bot AI Signal Engine",
        "version": "1.0.0",
        "status": "operational" if engine.is_running else "stopped"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy" if engine.is_running else "unhealthy",
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)