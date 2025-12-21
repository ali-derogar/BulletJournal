#!/bin/bash
# Script to run both frontend and backend together

echo "🚀 Starting Bullet Journal PWA - Frontend + Backend"
echo "=================================================="

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    pkill -f "uvicorn" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "⚠️  Backend directory not found, skipping backend server"
    SKIP_BACKEND=true
else
    SKIP_BACKEND=false

    # Check if venv exists
    if [ ! -d "backend/venv" ]; then
        echo "⚠️  Python virtual environment not found!"
        echo "   Creating virtual environment..."
        cd backend
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt 2>/dev/null || echo "   Note: requirements.txt not found or installation failed"
        cd ..
    fi
fi

# Build frontend (optional - comment out if you want faster startup)
echo "🔨 Building frontend..."
npm run build
echo "   ✅ Build completed!"

# Start backend in background (if available)
if [ "$SKIP_BACKEND" = false ]; then
    echo "📡 Starting backend server on http://localhost:8000"
    cd backend

    # Try to find uvicorn in venv
    if [ -f "venv/bin/uvicorn" ]; then
        PYTHONPATH=$(pwd) venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload > ../backend.log 2>&1 &
        BACKEND_PID=$!
        cd ..

        # Wait for backend to be ready
        echo "   Waiting for backend to start..."
        for i in {1..15}; do
            if curl -s http://localhost:8000/health > /dev/null 2>&1; then
                echo "   ✅ Backend ready!"
                break
            fi
            if [ $i -eq 15 ]; then
                echo "   ⚠️  Backend taking longer than expected (continuing anyway)"
                echo "   Check backend.log if you need the API"
            fi
            sleep 1
        done
    else
        cd ..
        echo "   ⚠️  Backend venv not properly configured, skipping backend"
        SKIP_BACKEND=true
    fi
fi

# Start frontend
echo "🌐 Starting frontend server on http://localhost:3000"
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo "   Waiting for frontend to start..."
sleep 5

echo ""
echo "✅ Servers are running!"
echo "   Frontend: http://localhost:3000"
if [ "$SKIP_BACKEND" = false ]; then
    echo "   Backend:  http://localhost:8000"
    echo "   API Docs: http://localhost:8000/docs"
fi
echo ""
echo "📝 Logs:"
echo "   Frontend: tail -f frontend.log"
if [ "$SKIP_BACKEND" = false ]; then
    echo "   Backend:  tail -f backend.log"
fi
echo ""
echo "💡 Press Ctrl+C to stop servers"

# Keep script running and show logs
if [ "$SKIP_BACKEND" = false ]; then
    tail -f frontend.log backend.log 2>/dev/null &
else
    tail -f frontend.log 2>/dev/null &
fi

# Wait for user to stop
wait
