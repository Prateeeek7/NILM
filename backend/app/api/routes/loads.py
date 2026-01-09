"""
API routes for load management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.schemas import LoadCreate, LoadUpdate, LoadResponse
from app.services.load_service import LoadService

router = APIRouter(prefix="/api/loads", tags=["loads"])


@router.post("", response_model=LoadResponse, status_code=status.HTTP_201_CREATED)
def create_load(load_data: LoadCreate, db: Session = Depends(get_db)):
    """Create a new load"""
    try:
        load = LoadService.create_load(db, load_data)
        return load
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[LoadResponse])
def get_loads(active_only: bool = False, db: Session = Depends(get_db)):
    """Get all loads"""
    loads = LoadService.get_all_loads(db, active_only=active_only)
    return loads


@router.get("/{load_id}", response_model=LoadResponse)
def get_load(load_id: int, db: Session = Depends(get_db)):
    """Get a load by ID"""
    load = LoadService.get_load(db, load_id)
    if not load:
        raise HTTPException(status_code=404, detail="Load not found")
    return load


@router.put("/{load_id}", response_model=LoadResponse)
def update_load(load_id: int, load_data: LoadUpdate, db: Session = Depends(get_db)):
    """Update a load"""
    load = LoadService.update_load(db, load_id, load_data)
    if not load:
        raise HTTPException(status_code=404, detail="Load not found")
    return load


@router.delete("/{load_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_load(load_id: int, db: Session = Depends(get_db)):
    """Delete (deactivate) a load"""
    success = LoadService.delete_load(db, load_id)
    if not success:
        raise HTTPException(status_code=404, detail="Load not found")


@router.get("/type/{load_type}", response_model=List[LoadResponse])
def get_loads_by_type(load_type: str, db: Session = Depends(get_db)):
    """Get loads by type"""
    loads = LoadService.get_loads_by_type(db, load_type)
    return loads





