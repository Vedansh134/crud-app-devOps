**Perfect! Now let's deploy your CRUD app to Kubernetes on Minikube.** I'll guide you through creating the Kubernetes manifests and deploying.

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

## **1. First, Build and Push Your Docker Image:**

Since your Docker image is built locally, we need to make it available to Minikube:

```bash
# Option A: Build directly in Minikube's Docker daemon
eval $(minikube docker-env)
docker build -t crud-app-backend:latest ..
eval $(minikube docker-env -u)  # Switch back

# Option B: Tag and use local image (simpler)
docker tag crud-app-devops-backend:latest crud-app-backend:latest
```

## **2. Create Kubernetes Manifests:**

### **A. crudapp_database.yml** (MongoDB Namespace)
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: crudapp-database
  labels:
    app: mongodb
```

### **B. crudapp_backend.yml** (Backend Namespace)
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: crudapp-backend
  labels:
    app: backend
```

### **C. mongodb_secret.yml** (MongoDB Credentials)
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-secret
  namespace: crudapp-database
type: Opaque
data:
  # echo -n "admin" | base64
  mongodb-username: YWRtaW4=
  # echo -n "password123" | base64
  mongodb-password: cGFzc3dvcmQxMjM=
  # echo -n "studentdb" | base64
  mongodb-database: c3R1ZGVudGRi
```

### **D. mongodb_pv.yml** (Persistent Volume - Minikube friendly)
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: mongodb-pv
spec:
  storageClassName: ""
  capacity:
    storage: 2Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  hostPath:
    path: "/data/mongodb"
    type: DirectoryOrCreate
```

### **E. mongodb_pvc.yml** (Persistent Volume Claim)
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongodb-pvc
  namespace: crudapp-database
spec:
  storageClassName: ""
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 2Gi
```

### **F. mongodb_statefulset.yml** (MongoDB Deployment)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb-deployment
  namespace: crudapp-database
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:latest
        ports:
        - containerPort: 27017
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: mongodb-username
        - name: MONGO_INITDB_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: mongodb-password
        - name: MONGO_INITDB_DATABASE
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: mongodb-database
        args: ["--bind_ip_all", "--auth"]
        volumeMounts:
        - name: mongodb-storage
          mountPath: /data/db
      volumes:
      - name: mongodb-storage
        persistentVolumeClaim:
          claimName: mongodb-pvc
```

### **G. mongodb_service.yml** (MongoDB Service)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb-service
  namespace: crudapp-database
spec:
  selector:
    app: mongodb
  ports:
  - port: 27017
    targetPort: 27017
  type: ClusterIP
```

### **H. backend_deployment.yml** (Backend Deployment)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-deployment
  namespace: crudapp-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: crud-app-backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: PORT
          value: "5000"
        - name: MONGODB_URI
          value: "mongodb://admin:password123@mongodb-service.crudapp-database.svc.cluster.local:27017/studentdb?authSource=admin"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### **I. backend_service.yml** (Backend Service - NodePort)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: crudapp-backend
spec:
  selector:
    app: backend
  ports:
  - port: 5000
    targetPort: 5000
    nodePort: 31000
  type: NodePort
```

## **3. Deployment Script:**

Create a deployment script:

```bash
cat > deploy.sh << 'EOF'
#!/bin/bash
echo "=== Deploying CRUD App to Kubernetes ==="

# 1. Create namespaces
echo "1. Creating namespaces..."
kubectl apply -f crudapp_database.yml
kubectl apply -f crudapp_backend.yml

# 2. Deploy MongoDB
echo "2. Deploying MongoDB..."
kubectl apply -f mongodb_secret.yml
kubectl apply -f mongodb_pv.yml
kubectl apply -f mongodb_pvc.yml
kubectl apply -f mongodb_statefulset.yml
kubectl apply -f mongodb_service.yml

# Wait for MongoDB
echo "Waiting for MongoDB to be ready..."
kubectl wait --for=condition=ready pod -n crudapp-database -l app=mongo --timeout=120s

# 3. Deploy Backend
echo "3. Deploying Backend..."
kubectl apply -f backend_deployment.yml
kubectl apply -f backend_service.yml

# 4. Check status
echo "4. Checking deployment status..."
kubectl get all -n crudapp-database
kubectl get all -n crudapp-backend

# 5. Get access URL
echo "5. Getting access URL..."
MINIKUBE_IP=$(minikube ip)
echo ""
echo "✅ Deployment Complete!"
echo "📱 Access your application at: http://$MINIKUBE_IP:31000"
echo "🖥️  Or use: minikube service -n crudapp-backend backend-service"
EOF

chmod +x deploy.sh
```

## **4. Apply Manifests:**

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

## **5. Verify Deployment:**

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

## **6. Access Your Application:**

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