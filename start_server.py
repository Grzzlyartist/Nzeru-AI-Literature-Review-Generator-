#!/usr/bin/env python3
"""
LitReview AI Server Startup Script
Simple script to start the FastAPI server with proper configuration
"""

import os
import sys
import uvicorn
from dotenv import load_dotenv

def main():
    # Load environment variables
    load_dotenv()
    
    # Check for required environment variables
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key or groq_api_key == "your_groq_api_key_here":
        print("❌ Error: GROQ_API_KEY not set!")
        print("Please:")
        print("1. Copy env.example to .env")
        print("2. Get your API key from https://console.groq.com/")
        print("3. Add your API key to the .env file")
        sys.exit(1)
    
    # Server configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    
    print("🚀 Starting LitReview AI Server...")
    print(f"📍 Server will be available at: http://{host}:{port}")
    print("🔑 Groq API Key: ✅ Configured")
    print("📚 AI Agent: ✅ Ready")
    print("\n" + "="*50)
    
    try:
        # Start the server
        uvicorn.run(
            "app:app",
            host=host,
            port=port,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()


