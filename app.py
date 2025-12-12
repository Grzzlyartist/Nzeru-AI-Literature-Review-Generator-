import uvicorn
import dotenv
import fastapi
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from ai_agent import LiteratureReviewAgent
import asyncio
import json
from fastapi.middleware.cors import CORSMiddleware
import requests
import uuid
from datetime import datetime

# Load environment variables
load_dotenv()

app = FastAPI(title="LitReview AI", description="AI-Powered Literature Review Generator")

# CORS for local dev (VSCode Live Server, etc.)
origins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5501",
    "http://127.0.0.1:5501",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="."), name="static")

# Templates
templates = Jinja2Templates(directory=".")

# Initialize AI Agent
ai_agent = LiteratureReviewAgent()

class ResearchTopic(BaseModel):
    topic: str
    objectives: str | None = None
    field: str = "general"
    max_sources: int = 20
    review_length: str = "comprehensive"

class LiteratureReviewResponse(BaseModel):
    success: bool
    review: str = None
    sources: list = None
    error: str = None

class PaymentData(BaseModel):
    firstName: str
    lastName: str
    email: str
    phone: str
    cardNumber: str
    expiryDate: str
    cvv: str
    plan: str
    price: str
    billing: str

class PaymentResponse(BaseModel):
    success: bool
    transaction_id: str = None
    plan: str = None
    amount: str = None
    message: str = None

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Serve the main landing page"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/generator", response_class=HTMLResponse)
async def read_generator(request: Request):
    """Serve the generator page"""
    return templates.TemplateResponse("generator.html", {"request": request})

@app.get("/pricing", response_class=HTMLResponse)
async def read_pricing(request: Request):
    """Serve the pricing page"""
    return templates.TemplateResponse("pricing.html", {"request": request})

@app.post("/api/generate-review", response_model=LiteratureReviewResponse)
async def generate_literature_review(research_topic: ResearchTopic):
    """Generate literature review using AI agent"""
    try:
        result = await ai_agent.generate_review(
            topic=research_topic.topic,
            field=research_topic.field,
            max_sources=research_topic.max_sources,
            review_length=research_topic.review_length,
            objectives=research_topic.objectives or ""
        )
        
        return LiteratureReviewResponse(
            success=True,
            review=result["review"],
            sources=result["sources"]
        )
        
    except Exception as e:
        return LiteratureReviewResponse(
            success=False,
            error=str(e)
        )

@app.post("/api/process-payment", response_model=PaymentResponse)
async def process_payment(payment_data: PaymentData):
    """Process payment through Intasend"""
    try:
        # Intasend API configuration
        intasend_api_key = os.getenv("INTASEND_API_KEY")
        intasend_publishable_key = os.getenv("INTASEND_PUBLISHABLE_KEY")
        
        if not intasend_api_key:
            # For development/testing, simulate successful payment
            transaction_id = f"TXN_{uuid.uuid4().hex[:8].upper()}"
            
            return PaymentResponse(
                success=True,
                transaction_id=transaction_id,
                plan=payment_data.plan,
                amount=payment_data.price,
                message="Payment processed successfully (test mode)"
            )
        
        # Parse expiry date
        month, year = payment_data.expiryDate.split('/')
        expiry_year = f"20{year}"
        
        # Prepare Intasend payment data
        intasend_data = {
            "amount": float(payment_data.price),
            "currency": "USD",
            "payment_method": {
                "type": "card",
                "card": {
                    "number": payment_data.cardNumber,
                    "expiry_month": int(month),
                    "expiry_year": int(expiry_year),
                    "cvv": payment_data.cvv
                }
            },
            "customer": {
                "first_name": payment_data.firstName,
                "last_name": payment_data.lastName,
                "email": payment_data.email,
                "phone": payment_data.phone
            },
            "metadata": {
                "plan": payment_data.plan,
                "billing": payment_data.billing,
                "service": "Nzeru AI Literature Review"
            }
        }
        
        # Make request to Intasend API
        headers = {
            "Authorization": f"Bearer {intasend_api_key}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            "https://api.intasend.com/v1/charges/",
            json=intasend_data,
            headers=headers
        )
        
        if response.status_code == 201:
            result = response.json()
            return PaymentResponse(
                success=True,
                transaction_id=result.get("id"),
                plan=payment_data.plan,
                amount=payment_data.price,
                message="Payment processed successfully"
            )
        else:
            error_data = response.json()
            raise HTTPException(
                status_code=400,
                detail=f"Payment failed: {error_data.get('detail', 'Unknown error')}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Payment processing error: {str(e)}"
        )

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "LitReview AI"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
