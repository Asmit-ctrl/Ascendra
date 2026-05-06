"""Rule Sync Service - Syncs MeTTa rules with database.

This service:
1. Loads learned rules from database into MeTTa engine
2. Proposes new rules based on teacher feedback patterns
3. Updates rule statistics based on usage
4. Exports rules for versioning

This is the bridge between the database (permanent storage)
and MeTTa engine (dynamic reasoning).
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pathlib import Path

from ..core.logging import AgentLogger
from .metta_engine import get_metta_engine, MeTTaRule


class RuleSyncService:
    """Syncs rules between database and MeTTa engine."""
    
    def __init__(self, supabase_client=None):
        self.logger = AgentLogger("rule_sync_service")
        self.supabase = supabase_client
        self.metta = get_metta_engine()
    
    async def sync_from_database(self):
        """Load active rules from database into MeTTa engine.
        
        This should be called on startup and periodically (e.g., every hour)
        to keep MeTTa engine in sync with learned rules.
        """
        if not self.supabase:
            self.logger.warning("No Supabase client - skipping database sync")
            return
        
        try:
            # Fetch active rules from database
            response = self.supabase.table("learned_rules").select("*").eq(
                "status", "active"
            ).execute()
            
            if not response.data:
                self.logger.info("No active rules in database")
                return
            
            # Import into MeTTa engine
            self.metta.import_rules_from_database(response.data)
            
            self.logger.info(
                f"Synced {len(response.data)} rules from database to MeTTa engine"
            )
            
        except Exception as e:
            self.logger.error(f"Failed to sync from database: {e}")
    
    async def propose_rules_from_feedback(
        self,
        min_feedback_count: int = 10,
        min_helpful_rate: float = 0.7
    ) -> List[MeTTaRule]:
        """Analyze teacher feedback and propose new rules.
        
        This is the "learning" part - system discovers patterns
        from teacher feedback and proposes new rules.
        
        Args:
            min_feedback_count: Minimum feedback entries to analyze
            min_helpful_rate: Minimum helpful rate to propose rule
            
        Returns:
            List of proposed rules
        """
        if not self.supabase:
            return []
        
        try:
            # Get recent helpful decisions
            one_week_ago = (datetime.now() - timedelta(days=7)).isoformat()
            
            response = self.supabase.table("ai_decisions").select("*").eq(
                "teacher_feedback", "helpful"
            ).gte("created_at", one_week_ago).execute()
            
            if len(response.data) < min_feedback_count:
                self.logger.info(
                    f"Not enough feedback to propose rules ({len(response.data)} < {min_feedback_count})"
                )
                return []
            
            # Analyze patterns
            proposed_rules = []
            
            # Pattern 1: Cultural examples that work
            cultural_patterns = self._analyze_cultural_patterns(response.data)
            for pattern in cultural_patterns:
                if pattern["success_rate"] >= min_helpful_rate:
                    rule = self._create_cultural_rule(pattern)
                    proposed_rules.append(rule)
            
            # Pattern 2: Scaffolding strategies that work
            scaffolding_patterns = self._analyze_scaffolding_patterns(response.data)
            for pattern in scaffolding_patterns:
                if pattern["success_rate"] >= min_helpful_rate:
                    rule = self._create_scaffolding_rule(pattern)
                    proposed_rules.append(rule)
            
            self.logger.info(f"Proposed {len(proposed_rules)} new rules from feedback")
            
            return proposed_rules
            
        except Exception as e:
            self.logger.error(f"Failed to propose rules: {e}")
            return []
    
    def _analyze_cultural_patterns(
        self,
        decisions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Analyze which cultural examples work in which contexts."""
        patterns = {}
        
        for decision in decisions:
            examples = decision.get("examples_used", [])
            region = decision.get("student_region")
            competency = decision.get("competency")
            
            if not examples or not region or not competency:
                continue
            
            for example in examples:
                key = f"{example}_{region}_{competency}"
                
                if key not in patterns:
                    patterns[key] = {
                        "example": example,
                        "region": region,
                        "competency": competency,
                        "count": 0,
                        "helpful_count": 0
                    }
                
                patterns[key]["count"] += 1
                if decision.get("teacher_feedback") == "helpful":
                    patterns[key]["helpful_count"] += 1
        
        # Calculate success rates
        result = []
        for pattern in patterns.values():
            if pattern["count"] >= 3:  # Minimum sample size
                pattern["success_rate"] = pattern["helpful_count"] / pattern["count"]
                result.append(pattern)
        
        return result
    
    def _analyze_scaffolding_patterns(
        self,
        decisions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Analyze which scaffolding strategies work for which student states."""
        patterns = {}
        
        for decision in decisions:
            scaffolding = decision.get("scaffolding_level")
            telemetry = decision.get("student_telemetry", {})
            
            if not scaffolding:
                continue
            
            # Create pattern key based on telemetry signals
            erasure_high = telemetry.get("erasure_count", 0) > 3
            dwell_high = telemetry.get("dwell_time_seconds", 0) > 60
            
            key = f"{scaffolding}_erasure_{erasure_high}_dwell_{dwell_high}"
            
            if key not in patterns:
                patterns[key] = {
                    "scaffolding_level": scaffolding,
                    "erasure_high": erasure_high,
                    "dwell_high": dwell_high,
                    "count": 0,
                    "helpful_count": 0
                }
            
            patterns[key]["count"] += 1
            if decision.get("teacher_feedback") == "helpful":
                patterns[key]["helpful_count"] += 1
        
        # Calculate success rates
        result = []
        for pattern in patterns.values():
            if pattern["count"] >= 5:  # Minimum sample size
                pattern["success_rate"] = pattern["helpful_count"] / pattern["count"]
                result.append(pattern)
        
        return result
    
    def _create_cultural_rule(self, pattern: Dict[str, Any]) -> MeTTaRule:
        """Create a MeTTa rule from a cultural pattern."""
        example = pattern["example"]
        region = pattern["region"]
        competency = pattern["competency"]
        
        rule_id = f"R_CULTURAL_{example.upper()}_{region.upper()}"
        rule_name = f"use_{example}_for_{region}_{competency.split('.')[-1].lower()}"
        
        conditions = f"""
        (and
          (= (get-context competency) "{competency}")
          (= (get-context student_region) "{region}"))
        """
        
        return MeTTaRule(
            rule_id=rule_id,
            rule_name=rule_name,
            conditions=conditions,
            action=f"use_{example}_examples",
            confidence=pattern["success_rate"],
            metadata={
                "scaffolding_level": "moderate",
                "explanation": f"Students in {region} respond well to {example} examples for {competency} ({pattern['success_rate']:.0%} success rate)",
                "applicable_regions": [region],
                "applicable_grades": ["all"],
                "examples": [example],
                "learned_from": "pattern_analysis",
                "sample_size": pattern["count"],
                "success_rate": pattern["success_rate"]
            }
        )
    
    def _create_scaffolding_rule(self, pattern: Dict[str, Any]) -> MeTTaRule:
        """Create a MeTTa rule from a scaffolding pattern."""
        scaffolding = pattern["scaffolding_level"]
        erasure_high = pattern["erasure_high"]
        dwell_high = pattern["dwell_high"]
        
        rule_id = f"R_SCAFFOLD_{scaffolding.upper()}_E{int(erasure_high)}_D{int(dwell_high)}"
        rule_name = f"use_{scaffolding}_when_erasure_{erasure_high}_dwell_{dwell_high}"
        
        conditions_parts = []
        if erasure_high:
            conditions_parts.append("(> (get-telemetry erasure_count) 3)")
        if dwell_high:
            conditions_parts.append("(> (get-telemetry dwell_time_seconds) 60)")
        
        conditions = f"(and\n  {chr(10).join(conditions_parts)})" if len(conditions_parts) > 1 else conditions_parts[0]
        
        return MeTTaRule(
            rule_id=rule_id,
            rule_name=rule_name,
            conditions=conditions,
            action=f"apply_{scaffolding}_scaffolding",
            confidence=pattern["success_rate"],
            metadata={
                "scaffolding_level": scaffolding,
                "explanation": f"Use {scaffolding} scaffolding when erasure={erasure_high}, dwell={dwell_high} ({pattern['success_rate']:.0%} success rate)",
                "applicable_regions": ["all"],
                "applicable_grades": ["all"],
                "learned_from": "pattern_analysis",
                "sample_size": pattern["count"],
                "success_rate": pattern["success_rate"]
            }
        )
    
    async def save_proposed_rule_to_database(self, rule: MeTTaRule):
        """Save a proposed rule to database for teacher validation."""
        if not self.supabase:
            return
        
        try:
            # Convert MeTTa rule to database format
            rule_data = {
                "rule_id": rule.rule_id,
                "rule_name": rule.rule_name,
                "rule_description": rule.metadata.get("explanation", ""),
                "conditions": self._parse_conditions_to_dict(rule.conditions),
                "action": rule.action,
                "scaffolding_level": rule.metadata.get("scaffolding_level"),
                "confidence": rule.confidence,
                "applicable_regions": rule.metadata.get("applicable_regions"),
                "applicable_grades": rule.metadata.get("applicable_grades"),
                "status": "proposed",  # Needs validation
                "discovered_from": rule.metadata.get("learned_from", "pattern_analysis")
            }
            
            self.supabase.table("learned_rules").insert(rule_data).execute()
            
            self.logger.info(f"Saved proposed rule to database: {rule.rule_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to save proposed rule: {e}")
    
    def _parse_conditions_to_dict(self, conditions: str) -> Dict[str, Any]:
        """Parse MeTTa conditions back to dictionary format for database.
        
        This is a simplified parser - in production, use proper MeTTa parser.
        """
        # For now, return a simple representation
        return {
            "metta_expression": conditions,
            "parsed": "See MeTTa expression"
        }
    
    async def update_rule_statistics(
        self,
        rule_id: str,
        was_helpful: bool
    ):
        """Update rule statistics in database after use."""
        if not self.supabase:
            return
        
        try:
            # Increment times_applied
            self.supabase.rpc(
                "increment_rule_applied",
                {"rule_uuid": rule_id}
            ).execute()
            
            # Increment times_helpful if feedback was positive
            if was_helpful:
                self.supabase.rpc(
                    "increment_rule_helpful",
                    {"rule_uuid": rule_id}
                ).execute()
            else:
                self.supabase.rpc(
                    "increment_rule_not_helpful",
                    {"rule_uuid": rule_id}
                ).execute()
            
            # Update confidence in MeTTa engine
            # Fetch updated statistics
            response = self.supabase.table("learned_rules").select(
                "times_applied, times_helpful"
            ).eq("rule_id", rule_id).execute()
            
            if response.data:
                stats = response.data[0]
                new_confidence = stats["times_helpful"] / max(stats["times_applied"], 1)
                self.metta.update_rule_confidence(rule_id, new_confidence)
            
        except Exception as e:
            self.logger.error(f"Failed to update rule statistics: {e}")
    
    async def export_rules_snapshot(self, output_dir: Path):
        """Export current rules to file for versioning.
        
        This creates a snapshot of all rules at a point in time.
        Useful for:
        - Version control
        - Rollback if needed
        - Auditing rule changes
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = output_dir / f"metta_rules_{timestamp}.json"
        
        self.metta.export_rules(output_path)
        
        self.logger.info(f"Exported rules snapshot to {output_path}")
        
        return output_path


# Singleton instance
_rule_sync_service: Optional[RuleSyncService] = None


def get_rule_sync_service(supabase_client=None) -> RuleSyncService:
    """Get or create the rule sync service singleton."""
    global _rule_sync_service
    if _rule_sync_service is None:
        _rule_sync_service = RuleSyncService(supabase_client)
    return _rule_sync_service
