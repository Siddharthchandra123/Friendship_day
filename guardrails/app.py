from fastapi import FastAPI
from pydantic import BaseModel
from nemoguardrails import RailsConfig
from nemoguardrails import LLMRails

config = RailsConfig.from_path("./config")
rails = LLMRails(config)

app = FastAPI()

class Prompt(BaseModel):
    message: str

@app.post("/chat")
async def chat(prompt: Prompt):

    result = await rails.generate_async(
        messages=[
            {
                "role":"user",
                "content":prompt.message
            }
        ]
    )

    return result