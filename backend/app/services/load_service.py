"""
Service for managing loads
"""
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from app.models.database_models import Load
from app.models.schemas import LoadCreate, LoadUpdate
import logging

logger = logging.getLogger(__name__)


class LoadService:
    """Service for load management operations"""
    
    @staticmethod
    def create_load(db: Session, load_data: LoadCreate) -> Load:
        """Create a new load"""
        # Calculate min/max if not provided
        min_power = load_data.min_power_watts
        max_power = load_data.max_power_watts
        min_current = load_data.min_current_amps
        max_current = load_data.max_current_amps
        
        if min_power is None:
            min_power = load_data.expected_power_watts * (1 - load_data.power_tolerance_percent / 100)
        if max_power is None:
            max_power = load_data.expected_power_watts * (1 + load_data.power_tolerance_percent / 100)
        if min_current is None:
            min_current = load_data.expected_current_amps * (1 - load_data.current_tolerance_percent / 100)
        if max_current is None:
            max_current = load_data.expected_current_amps * (1 + load_data.current_tolerance_percent / 100)
        
        load = Load(
            name=load_data.name,
            load_type=load_data.load_type,
            expected_power_watts=load_data.expected_power_watts,
            expected_current_amps=load_data.expected_current_amps,
            power_tolerance_percent=load_data.power_tolerance_percent,
            current_tolerance_percent=load_data.current_tolerance_percent,
            min_power_watts=min_power,
            max_power_watts=max_power,
            min_current_amps=min_current,
            max_current_amps=max_current,
            description=load_data.description,
            manufacturer=load_data.manufacturer,
            model_number=load_data.model_number,
            specifications=load_data.specifications
        )
        
        try:
            db.add(load)
            db.commit()
            db.refresh(load)
            logger.info(f"Created load: {load.name}")
            return load
        except IntegrityError:
            db.rollback()
            raise ValueError(f"Load with name '{load_data.name}' already exists")
    
    @staticmethod
    def get_load(db: Session, load_id: int) -> Optional[Load]:
        """Get a load by ID"""
        return db.query(Load).filter(Load.id == load_id).first()
    
    @staticmethod
    def get_load_by_name(db: Session, name: str) -> Optional[Load]:
        """Get a load by name"""
        return db.query(Load).filter(Load.name == name).first()
    
    @staticmethod
    def get_all_loads(db: Session, active_only: bool = False) -> List[Load]:
        """Get all loads"""
        query = db.query(Load)
        if active_only:
            query = query.filter(Load.is_active == True)
        return query.order_by(Load.name).all()
    
    @staticmethod
    def get_loads_by_type(db: Session, load_type: str) -> List[Load]:
        """Get loads by type"""
        return db.query(Load).filter(
            Load.load_type == load_type,
            Load.is_active == True
        ).all()
    
    @staticmethod
    def update_load(db: Session, load_id: int, load_data: LoadUpdate) -> Optional[Load]:
        """Update a load"""
        load = db.query(Load).filter(Load.id == load_id).first()
        if not load:
            return None
        
        # Update fields
        update_data = load_data.model_dump(exclude_unset=True)
        
        # Recalculate min/max if power or current changed
        if 'expected_power_watts' in update_data or 'power_tolerance_percent' in update_data:
            expected_power = update_data.get('expected_power_watts', load.expected_power_watts)
            tolerance = update_data.get('power_tolerance_percent', load.power_tolerance_percent)
            if 'min_power_watts' not in update_data:
                update_data['min_power_watts'] = expected_power * (1 - tolerance / 100)
            if 'max_power_watts' not in update_data:
                update_data['max_power_watts'] = expected_power * (1 + tolerance / 100)
        
        if 'expected_current_amps' in update_data or 'current_tolerance_percent' in update_data:
            expected_current = update_data.get('expected_current_amps', load.expected_current_amps)
            tolerance = update_data.get('current_tolerance_percent', load.current_tolerance_percent)
            if 'min_current_amps' not in update_data:
                update_data['min_current_amps'] = expected_current * (1 - tolerance / 100)
            if 'max_current_amps' not in update_data:
                update_data['max_current_amps'] = expected_current * (1 + tolerance / 100)
        
        for key, value in update_data.items():
            setattr(load, key, value)
        
        try:
            db.commit()
            db.refresh(load)
            logger.info(f"Updated load: {load.name}")
            return load
        except IntegrityError:
            db.rollback()
            raise ValueError(f"Load with name '{update_data.get('name')}' already exists")
    
    @staticmethod
    def delete_load(db: Session, load_id: int) -> bool:
        """Delete a load (soft delete by setting is_active=False)"""
        load = db.query(Load).filter(Load.id == load_id).first()
        if not load:
            return False
        
        load.is_active = False
        db.commit()
        logger.info(f"Deactivated load: {load.name}")
        return True
    
    @staticmethod
    def match_load_by_specs(db: Session, power: float, current: float) -> Optional[Load]:
        """Match a load by power and current specifications"""
        loads = db.query(Load).filter(Load.is_active == True).all()
        
        for load in loads:
            # Check if power and current are within tolerance
            power_match = (
                load.min_power_watts <= power <= load.max_power_watts
            )
            current_match = (
                load.min_current_amps <= current <= load.max_current_amps
            )
            
            if power_match and current_match:
                return load
        
        return None





