"""
Background job scheduler for automated recurring transaction generation.

This module sets up APScheduler to automatically generate recurring transactions
at specified intervals.

Installation:
    pip install APScheduler
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class RecurringTransactionScheduler:
    """Manages APScheduler for recurring transaction generation."""
    
    _scheduler = None
    
    @classmethod
    def init_scheduler(cls):
        """Initialize background scheduler.
        
        Should be called on application startup.
        
        Example (in main.py):
            from app.tasks.scheduler_config import RecurringTransactionScheduler
            
            RecurringTransactionScheduler.init_scheduler()
        """
        if cls._scheduler is None:
            cls._scheduler = BackgroundScheduler()
            
            # Add job to run recurring transactions every 24 hours at 2 AM
            cls._scheduler.add_job(
                func=cls.run_recurring_generation,
                trigger=CronTrigger(hour=2, minute=0),
                id='recurring_transactions_daily',
                name='Generate recurring transactions',
                misfire_grace_time=600,
                coalesce=True,
                replace_existing=True
            )
            
            logger.info("Scheduler initialized with recurring transaction job")
    
    @classmethod
    def start_scheduler(cls):
        """Start the background scheduler.
        
        Should be called on application startup.
        
        Example (in main.py):
            @app.on_event("startup")
            async def startup_event():
                RecurringTransactionScheduler.start_scheduler()
        """
        if cls._scheduler and not cls._scheduler.running:
            cls._scheduler.start()
            logger.info("Scheduler started")
    
    @classmethod
    def stop_scheduler(cls):
        """Stop the background scheduler.
        
        Should be called on application shutdown.
        
        Example (in main.py):
            @app.on_event("shutdown")
            async def shutdown_event():
                RecurringTransactionScheduler.stop_scheduler()
        """
        if cls._scheduler and cls._scheduler.running:
            cls._scheduler.shutdown()
            logger.info("Scheduler stopped")
    
    @staticmethod
    def run_recurring_generation():
        """Generate pending recurring transactions.
        
        Called automatically by scheduler.
        """
        from sqlalchemy.orm import Session
        from app.db.database import engine
        from app.services.recurring_service import generate_recurring_transactions
        
        try:
            with Session(bind=engine) as db:
                result = generate_recurring_transactions(db)
                logger.info(
                    f"Generated {result.generated_count} recurring transactions, "
                    f"failed: {result.failed_count}, skipped: {result.skipped_count}"
                )
                
                if result.errors:
                    logger.warning(f"Generation errors: {result.errors}")
        
        except Exception as e:
            logger.error(f"Error generating recurring transactions: {str(e)}", exc_info=True)


# Job definitions for custom schedules
class RecurringJobDefinitions:
    """Predefined job configurations."""
    
    DAILY_2AM = {
        'trigger': CronTrigger(hour=2, minute=0),
        'id': 'recurring_daily_2am',
        'name': 'Daily recurring generation at 2 AM'
    }
    
    HOURLY = {
        'trigger': IntervalTrigger(hours=1),
        'id': 'recurring_hourly',
        'name': 'Hourly recurring generation'
    }
    
    EVERY_15_MINUTES = {
        'trigger': IntervalTrigger(minutes=15),
        'id': 'recurring_15min',
        'name': 'Recurring generation every 15 minutes'
    }
    
    EVERY_3_HOURS = {
        'trigger': IntervalTrigger(hours=3),
        'id': 'recurring_3hours',
        'name': 'Recurring generation every 3 hours'
    }
    
    WEEKLY_SUNDAY_MIDNIGHT = {
        'trigger': CronTrigger(day_of_week=6, hour=0, minute=0),
        'id': 'recurring_weekly_sunday',
        'name': 'Weekly recurring generation (Sunday midnight)'
    }
