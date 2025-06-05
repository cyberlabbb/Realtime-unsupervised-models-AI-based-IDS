@app.route("/api/alerts/<alert_id>", methods=["DELETE"])
@token_required 
def delete_alert(current_user, alert_id):
    try:
        result = alerts_collection.delete_one({"_id": ObjectId(alert_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Alert not found"}), 404
        return jsonify({"message": "Alert deleted successfully"})
    except Exception as e:
        logger.error(f"Failed to delete alert {alert_id}: {e}")
        return jsonify({"error": str(e)}), 500