#!/usr/bin/env python3
"""
🚀 BOOMROACH HYDRA-BOT STARTUP SCRIPT
"""

import os
import sys
import subprocess
import asyncio
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('HydraBotStarter')

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        logger.error("❌ Python 3.8 or higher is required")
        sys.exit(1)
    logger.info(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")

def install_requirements():
    """Install Python requirements"""
    try:
        logger.info("📦 Installing Python requirements...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        logger.info("✅ Requirements installed successfully")
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed to install requirements: {e}")
        sys.exit(1)

def setup_environment():
    """Set up environment variables"""
    # Set default environment variables if not present
    env_vars = {
        'API_BASE_URL': 'http://localhost:3001',
        'WS_URL': 'ws://localhost:3001',
        'SOLANA_RPC_URL': 'https://api.devnet.solana.com',
        'HYDRA_BOT_API_KEY': 'hydra-bot-secret-key-2024',
        'PYTHONUNBUFFERED': '1'
    }

    for key, default_value in env_vars.items():
        if key not in os.environ:
            os.environ[key] = default_value
            logger.info(f"🔧 Set {key} = {default_value}")

    logger.info("✅ Environment configured")

def check_backend_connection():
    """Check if backend is running"""
    import aiohttp
    import asyncio

    async def test_connection():
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{os.environ['API_BASE_URL']}/health") as response:
                    if response.status == 200:
                        logger.info("✅ Backend connection successful")
                        return True
                    else:
                        logger.warning(f"⚠️ Backend returned status {response.status}")
                        return False
        except Exception as e:
            logger.warning(f"⚠️ Backend connection failed: {e}")
            return False

    return asyncio.run(test_connection())

def main():
    """Main startup function"""
    logger.info("🤖 BOOMROACH HYDRA-BOT STARTUP")
    logger.info("=" * 50)

    # Check Python version
    check_python_version()

    # Install requirements
    if '--install' in sys.argv or '--setup' in sys.argv:
        install_requirements()

    # Setup environment
    setup_environment()

    # Check backend connection
    if '--check-backend' in sys.argv or '--setup' in sys.argv:
        if not check_backend_connection():
            logger.warning("⚠️ Backend not accessible. Hydra-Bot will attempt to connect anyway.")

    # Start Hydra-Bot
    logger.info("🚀 Starting Hydra-Bot system...")
    try:
        from main import main as hydra_main
        asyncio.run(hydra_main())
    except KeyboardInterrupt:
        logger.info("🛑 Shutdown requested by user")
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
