"""
The Viral Engine - Main FastAPI Application
Backend API for automated AI video generation
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import asyncio

from app.config import settings
from app.services.openrouter_client import openrouter_client
from app.services.voice_service import elevenlabs_service
from app.services.video_processor import video_processor

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered viral video generation platform"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for projects (replace with database in production)
projects_db = {}


# Pydantic Models
class VideoGenerationRequest(BaseModel):
    topic: str
    voice_id: str
    duration: int = 60
    style: str = "engaging"
    resolution: tuple = (1080, 1920)


class ProjectStatus(BaseModel):
    project_id: str
    status: str  # pending, generating_script, generating_audio, generating_visuals, processing_video, completed, failed
    progress: int  # 0-100
    current_step: str
    video_url: Optional[str] = None
    error: Optional[str] = None


@app.post("/api/generate", response_model=ProjectStatus)
async def generate_video(request: VideoGenerationRequest, background_tasks: BackgroundTasks):
    """
    Start the video generation process
    """
    project_id = str(uuid.uuid4())
    
    project = {
        "project_id": project_id,
        "status": "pending",
        "progress": 0,
        "current_step": "Initializing project...",
        "topic": request.topic,
        "voice_id": request.voice_id,
        "duration": request.duration,
        "style": request.style,
        "created_at": datetime.utcnow()
    }
    
    projects_db[project_id] = project
    
    # Start background task
    background_tasks.add_task(process_video_generation, project_id)
    
    return ProjectStatus(**project)


@app.get("/api/status/{project_id}", response_model=ProjectStatus)
async def get_status(project_id: str):
    """
    Get the status of a video generation project
    """
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return ProjectStatus(**projects_db[project_id])


async def process_video_generation(project_id: str):
    """
    Main background task for generating the video
    """
    project = projects_db[project_id]
    
    try:
        # Step 1: Generate Script (20% progress)
        project["status"] = "generating_script"
        project["current_step"] = "Writing engaging script and scene descriptions..."
        project["progress"] = 10
        
        script_data = await openrouter_client.generate_script(
            topic=project["topic"],
            duration=project["duration"],
            style=project["style"]
        )
        
        project["script"] = script_data["script"]
        scenes = script_data["scenes"]
        project["progress"] = 25
        
        # Step 2: Generate Voiceover (40% progress)
        project["status"] = "generating_audio"
        project["current_step"] = "Generating AI voiceover with ElevenLabs..."
        
        audio_files = await elevenlabs_service.generate_voiceover(
            script=project["script"],
            voice_id=project["voice_id"],
            project_id=project_id
        )
        
        project["audio_files"] = audio_files
        project["progress"] = 45
        
        # Step 3: Generate Visuals (70% progress)
        project["status"] = "generating_visuals"
        project["current_step"] = f"Generating {len(scenes)} AI video clips using Runway/Flux..."
        
        video_clips = []
        for i, scene in enumerate(scenes):
            project["current_step"] = f"Generating scene {i+1} of {len(scenes)}: {scene['description'][:50]}..."
            
            video_path = await video_processor.generate_scene_video(
                description=scene["description"],
                style=project["style"],
                project_id=project_id,
                scene_index=i
            )
            
            video_clips.append(video_path)
        
        project["video_clips"] = video_clips
        project["progress"] = 70
        
        # Step 4: Process and merge everything (100% progress)
        project["status"] = "processing_video"
        project["current_step"] = "Merging clips and adding subtitles"
        project["progress"] = 80
        
        final_video_path = await video_processor.create_final_video(
            scenes=scenes,
            video_clips=video_clips,
            audio_files=audio_files,
            project_id=project_id
        )
        
        project["video_path"] = final_video_path
        project["video_url"] = f"/api/download/{project_id}"
        project["progress"] = 100
        project["status"] = "completed"
        project["current_step"] = "Video ready!"
        
    except Exception as e:
        project["status"] = "failed"
        project["error"] = str(e)
        project["current_step"] = f"Error: {str(e)}"
        print(f"Error generating video for project {project_id}: {e}")


# List all projects (for dashboard)
@app.get("/api/projects")
async def list_projects():
    """
    List all video generation projects
    """
    return [
        ProjectStatus(**project)
        for project in projects_db.values()
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
