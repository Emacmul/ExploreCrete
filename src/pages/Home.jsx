import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, MapPin, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CreteMap from '../components/map/CreteMap';
import WalkList from '../components/walks/WalkList';
import WalkDetail from '../components/walks/WalkDetail';

export default function Home() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWalk, setSelectedWalk] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tapLocation, setTapLocation] = useState(null);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          base44.auth.redirectToLogin();
          return;
        }
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        base44.auth.redirectToLogin();
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Fetch walks
  const { data: walks = [], isLoading: walksLoading } = useQuery({
    queryKey: ['walks'],
    queryFn: () => base44.entities.Walk.list(),
    enabled: !!user,
  });

  const handleWalkSelect = (walk) => {
    setSelectedWalk(walk);
    setShowDetail(true);
  };

  const handleMapClick = (latlng) => {
    setTapLocation(latlng);
    // Find nearby walks (within ~20km)
    const nearbyWalks = walks.filter(walk => {
      const distance = Math.sqrt(
        Math.pow(walk.start_lat - latlng.lat, 2) + 
        Math.pow(walk.start_lng - latlng.lng, 2)
      );
      return distance < 0.2; // Roughly 20km
    });
    
    if (nearbyWalks.length > 0) {
      setSelectedWalk(nearbyWalks[0]);
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-amber-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Crete Walking Trails</h1>
              <p className="text-xs text-gray-500">Discover the island's beauty</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>{user?.full_name || user?.email}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto p-4">
        <div className="grid lg:grid-cols-3 gap-4 h-[calc(100vh-120px)]">
          {/* Walk list */}
          <div className="lg:col-span-1 h-full">
            <WalkList
              walks={walks}
              selectedWalk={selectedWalk}
              onWalkSelect={handleWalkSelect}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>

          {/* Map and detail */}
          <div className="lg:col-span-2 h-full relative">
            <AnimatePresence mode="wait">
              {showDetail && selectedWalk ? (
                <motion.div
                  key="detail"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <WalkDetail 
                    walk={selectedWalk} 
                    onClose={() => setShowDetail(false)} 
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="map"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <div className="h-full rounded-2xl overflow-hidden shadow-xl border">
                    {walksLoading ? (
                      <div className="h-full bg-gray-100 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      </div>
                    ) : (
                      <CreteMap
                        walks={walks}
                        selectedWalk={selectedWalk}
                        onWalkSelect={handleWalkSelect}
                        onMapClick={handleMapClick}
                      />
                    )}
                  </div>
                  
                  {/* Instructions overlay */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
                    <p className="text-sm text-gray-600 text-center">
                      <span className="font-medium text-gray-900">Tap the map</span> to find walks near that location, 
                      or <span className="font-medium text-gray-900">tap a walk code</span> to see details
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}