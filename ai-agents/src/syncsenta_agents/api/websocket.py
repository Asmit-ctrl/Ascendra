"""WebSocket handler for real-time teacher dashboard updates."""

from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio
from datetime import datetime

from ..core.logging import AgentLogger


class ConnectionManager:
    """Manages WebSocket connections for teacher dashboard."""
    
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "teachers": set(),
            "students": set()
        }
        self.logger = AgentLogger("websocket_manager")
    
    async def connect(self, websocket: WebSocket, client_type: str):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[client_type].add(websocket)
        self.logger.info(
            f"New {client_type} connection",
            total_connections=len(self.active_connections[client_type])
        )
    
    def disconnect(self, websocket: WebSocket, client_type: str):
        """Remove a WebSocket connection."""
        self.active_connections[client_type].discard(websocket)
        self.logger.info(
            f"{client_type} disconnected",
            remaining_connections=len(self.active_connections[client_type])
        )
    
    async def broadcast_to_teachers(self, message: dict):
        """Broadcast message to all connected teachers."""
        disconnected = set()
        
        for connection in self.active_connections["teachers"]:
            try:
                await connection.send_json(message)
            except Exception as e:
                self.logger.error(f"Failed to send to teacher: {e}")
                disconnected.add(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn, "teachers")
    
    async def send_to_student(self, student_id: str, message: dict):
        """Send message to a specific student."""
        # In production, maintain student_id -> websocket mapping
        # For now, broadcast to all students (they filter client-side)
        message["target_student_id"] = student_id
        
        disconnected = set()
        for connection in self.active_connections["students"]:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)
        
        for conn in disconnected:
            self.disconnect(conn, "students")


# Global connection manager instance
manager = ConnectionManager()


async def handle_student_activity(activity_data: dict):
    """Process student activity and broadcast to teachers."""
    
    # Prepare teacher dashboard update
    teacher_update = {
        "type": "student_activity",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "student_id": activity_data.get("student_id"),
            "student_name": activity_data.get("student_name", "Unknown"),
            "activity": activity_data.get("activity_type"),
            "subject": activity_data.get("subject"),
            "topic": activity_data.get("topic"),
            "agent_used": activity_data.get("agent_used"),
            "status": activity_data.get("status", "active"),
            "duration": activity_data.get("duration_seconds", 0)
        }
    }
    
    # Broadcast to all teachers
    await manager.broadcast_to_teachers(teacher_update)


async def handle_agent_interaction(interaction_data: dict):
    """Process AI agent interaction and update teachers."""
    
    teacher_update = {
        "type": "agent_usage",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "student_id": interaction_data.get("student_id"),
            "agent_type": interaction_data.get("agent_type"),
            "response_time_ms": interaction_data.get("response_time_ms"),
            "success": interaction_data.get("success", True),
            "tokens_used": interaction_data.get("tokens_used", 0)
        }
    }
    
    await manager.broadcast_to_teachers(teacher_update)


async def handle_alert(alert_data: dict):
    """Send alert to teacher dashboard."""
    
    alert_message = {
        "type": "alert",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "alert_type": alert_data.get("alert_type"),
            "severity": alert_data.get("severity", "medium"),
            "student_id": alert_data.get("student_id"),
            "student_name": alert_data.get("student_name"),
            "message": alert_data.get("message"),
            "metadata": alert_data.get("metadata", {})
        }
    }
    
    await manager.broadcast_to_teachers(alert_message)


async def handle_teacher_intervention(intervention_data: dict):
    """Handle teacher intervention and send to student."""
    
    student_message = {
        "type": "teacher_intervention",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "intervention_type": intervention_data.get("intervention_type"),
            "content": intervention_data.get("content"),
            "teacher_name": intervention_data.get("teacher_name", "Your Teacher")
        }
    }
    
    await manager.send_to_student(
        intervention_data.get("student_id"),
        student_message
    )
