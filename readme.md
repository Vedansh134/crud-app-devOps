# Detailed guide about kubernetes commands and debugging

## **Project Structure for Kubernetes:**
```
kubernetes/
├── crudapp_backend.yml         # Backend namespace
├── crudapp_database.yml        # Database namespace
├── mongodb_secret.yml          # MongoDB credentials
├── mongodb_pv.yml              # Persistent Volume
├── mongodb_pvc.yml             # Persistent Volume Claim
├── mongodb_statefulset.yml     # MongoDB StatefulSet/Deployment
├── mongodb_service.yml         # MongoDB Service
├── backend_deployment.yml      # Backend Deployment
└── backend_service.yml         # Backend Service (NodePort)
```

## First, Build and Push Your Docker Image:**

```bash
docker tag crud-app-devops-backend:latest crud-app-backend:latest
```

## ** Apply Manifests:**

```bash
# Make sure you're in the kubernetes directory
cd kubernetes

# Apply all manifests
./deploy.sh

# Or manually apply in order:
kubectl apply -f crudapp_database.yml
kubectl apply -f crudapp_backend.yml
kubectl apply -f mongodb_secret.yml
kubectl apply -f mongodb_pv.yml
kubectl apply -f mongodb_pvc.yml
kubectl apply -f mongodb_statefulset.yml
kubectl apply -f mongodb_service.yml
kubectl apply -f backend_deployment.yml
kubectl apply -f backend_service.yml
```
## **. Verify Deployment:**

```bash
# Check all resources
kubectl get all -A

# Check specific namespaces
kubectl get all -n crudapp-database
kubectl get all -n crudapp-backend

# Check logs
kubectl logs -n crudapp-database deployment/mongodb-deployment --tail=10
kubectl logs -n crudapp-backend deployment/backend-deployment --tail=10

# Check if MongoDB is accessible
kubectl exec -n crudapp-database $(kubectl get pod -n crudapp-database -l app=mongo -o name) -- \
  mongosh -u admin -p password123 --eval "db.adminCommand('ping')"
```

## Get access URL
echo "Getting access URL..."
MINIKUBE_IP=$(minikube ip)
echo ""
echo "✅ Deployment Complete!"
echo "📱 Access your application at: http://$MINIKUBE_IP:31000"
echo "🖥️  Or use: minikube service -n crudapp-backend backend-service"

## ** Access Your Application:**

### **Option 1: Using Minikube Service**
```bash
# This will open browser or give URL
minikube service -n crudapp-backend backend-service

# Or just get URL
minikube service -n crudapp-backend backend-service --url
```

### **Option 2: Direct NodePort Access**
```bash
MINIKUBE_IP=$(minikube ip)
echo "Access at: http://$MINIKUBE_IP:31000"

# Test with curl
curl http://$MINIKUBE_IP:31000/
```

### **Option 3: Port Forward (for testing)**
```bash
# Forward to localhost
kubectl port-forward -n crudapp-backend service/backend-service 5000:5000

# Access at: http://localhost:5000
```

## **7. Troubleshooting:**

If you have issues:

```bash
# 1. Check pods
kubectl get pods -A

# 2. Check pod details
kubectl describe pod -n crudapp-backend <pod-name>

# 3. Check logs
kubectl logs -n crudapp-backend deployment/backend-deployment

# 4. Check events
kubectl get events -A --sort-by='.lastTimestamp'

# 5. Check if image exists in Minikube
minikube ssh docker images | grep crud-app-backend

# 6. If image not found, load it
minikube image load crud-app-devops-backend:latest
minikube image tag crud-app-devops-backend:latest crud-app-backend:latest
```

## **8. Cleanup Script:**

```bash
cat > cleanup.sh << 'EOF'
#!/bin/bash
echo "=== Cleaning up CRUD App from Kubernetes ==="

# Delete backend resources
kubectl delete -f backend_service.yml
kubectl delete -f backend_deployment.yml

# Delete MongoDB resources
kubectl delete -f mongodb_service.yml
kubectl delete -f mongodb_statefulset.yml
kubectl delete -f mongodb_pvc.yml
kubectl delete -f mongodb_pv.yml
kubectl delete -f mongodb_secret.yml

# Delete namespaces
kubectl delete -f crudapp_backend.yml
kubectl delete -f crudapp_database.yml

echo "✅ Cleanup complete!"
EOF

chmod +x cleanup.sh
```

## **Next Steps:**

1. **Apply the manifests** in the order shown above
2. **Verify** everything is running
3. **Access** your application
4. **Test** CRUD operations work

**Your Kubernetes deployment is ready!** Just run the deployment script and your app will be available at `http://<minikube-ip>:31000`.

- To access the data in mongodb
# kubectl exec -it -n crudapp-database pod/mongo-deployment-7ccbf9f9c-7cltb -- mongosh -u admin -p password123 

- Inside the pod-container use these commands
```bash
# 1. Check db
show dbs;

# 2. Use database
use <database_name>;

# 3. Check collections in database
show collections;

# 4. Show particular collection data
db.<collection_name>.find();
```