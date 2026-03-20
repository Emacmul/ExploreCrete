import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, MapPin, User, ShieldCheck, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useOfflineWalks } from '../components/offline/useOfflineWalks';
import { motion, AnimatePresence } from 'framer-motion';
import CreteMap from '../components/map/CreteMap';
import WalkList from '../components/walks/WalkList';
import WalkDetail from '../components/walks/WalkDetail';
import UpdateInProgressModal from '../components/offline/UpdateInProgressModal';
import { isWalkOutdated, saveWalkOffline, preCacheWalkTiles } from '../components/offline/offlineStorage';
import SplashScreen from '../components/onboarding/SplashScreen';
import RegistrationForm from '../components/onboarding/RegistrationForm';
import RedeemCode from '../components/walks/RedeemCode';

export default function Home() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWalk, setSelectedWalk] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tapLocation, setTapLocation] = useState(null);
  const [updatingWalkName, setUpdatingWalkName] = useState(null);
  const [pendingWalkToOpen, setPendingWalkToOpen] = useState(null);
  const [showSplash, setShowSplash] = useState(true);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const { getAllOfflineWalks } = useOfflineWalks();
  const offlineCount = getAllOfflineWalks().length;
  const updatingRef = useRef(false);

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
        // Check if user has completed registration
        const appUsers = await base44.entities.AppUser.filter({ user_id: userData.id });
        if (appUsers.length > 0 && appUsers[0].registration_complete) {
          setRegistrationComplete(true);
        }
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

  // Auto-update downloaded walks when server version is newer
  useEffect(() => {
    if (!walks.length || updatingRef.current) return;
    const runUpdates = async () => {
      updatingRef.current = true;
      for (const serverWalk of walks) {
        const outdated = await isWalkOutdated(serverWalk);
        if (outdated) {
          setUpdatingWalkName(serverWalk.name);
          await saveWalkOffline(serverWalk);
          await preCacheWalkTiles(serverWalk, () => {});
          setUpdatingWalkName(null);
          // If user had selected this walk, update the selected walk too
          setSelectedWalk(prev => prev?.id === serverWalk.id ? serverWalk : prev);
        }
      }
      updatingRef.current = false;
    };
    runUpdates();
  }, [walks]);

  const handleWalkSelect = async (walk) => {
    // Check if this walk needs an update before opening
    const outdated = await isWalkOutdated(walk);
    if (outdated) {
      setUpdatingWalkName(walk.name);
      await saveWalkOffline(walk);
      await preCacheWalkTiles(walk, () => {});
      setUpdatingWalkName(null);
    }
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

  // Show registration form if user hasn't completed it yet
  if (!registrationComplete && !showSplash) {
    return <RegistrationForm user={user} onComplete={() => setRegistrationComplete(true)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-amber-50">
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <UpdateInProgressModal walkName={updatingWalkName} />
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
            <Link to={createPageUrl('MyWalks')}>
              <Button variant="outline" size="sm" className="gap-2 border-green-300 text-green-700 hover:bg-green-50 relative">
                <WifiOff className="w-4 h-4" />
                <span className="hidden sm:inline">My Walks</span>
                {offlineCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {offlineCount}
                  </span>
                )}
              </Button>
            </Link>
            {user?.role === 'admin' && (
              <Link to={createPageUrl('Admin')}>
                <Button variant="outline" size="sm" className="gap-2 border-amber-300 text-amber-600 hover:bg-amber-50">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              </Link>
            )}
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