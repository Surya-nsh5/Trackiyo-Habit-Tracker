import React, { useState, useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { FiLogOut, FiUser, FiMail, FiCamera, FiMoon, FiSun } from 'react-icons/fi';

export const SettingsPage: React.FC = () => {
  const { user, updateUser, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.fromTo(containerRef.current, 
      { opacity: 0, y: 20 }, 
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    );
  }, []);


  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name, email });
    // Show a small success animation on the button
    gsap.fromTo('.gsap-save-btn', 
      { scale: 0.95, backgroundColor: '#22c55e', color: '#fff' }, 
      { scale: 1, backgroundColor: '#ffffff', color: '#000', duration: 0.8, ease: 'power2.out' }
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateUser({ avatar: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div ref={containerRef} className="absolute inset-0 flex flex-col p-6 overflow-y-auto custom-scrollbar">
      
      {/* Header Removed */}

      <div className="max-w-3xl w-full mx-auto space-y-12">
        
        {/* Profile Section */}
        <section>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-widest mb-8">PROFILE</h2>
          
          <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
            
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <div 
                className="w-32 h-32 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 flex items-center justify-center relative group cursor-pointer overflow-hidden shadow-xl transition-transform hover:scale-105"
                onClick={() => fileInputRef.current?.click()}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full object-cover group-hover:opacity-30 transition-opacity" />
                ) : (
                  <span className="text-4xl font-bold text-zinc-800 dark:text-white leading-none pt-2 group-hover:opacity-30 transition-opacity">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
                
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <FiCamera size={24} className="text-white mb-1" />
                  <span className="text-[10px] font-bold tracking-widest text-white uppercase">Upload</span>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/jpeg, image/png, image/webp" 
                className="hidden" 
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-600 tracking-wider text-center max-w-[120px]">JPG, PNG or WebP.<br/>Max size of 2MB.</p>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSave} className="flex-1 w-full space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-2 tracking-wider">FULL NAME</label>
                <div className="flex items-center bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 h-14 focus-within:border-zinc-400 dark:focus-within:border-zinc-500 transition-colors">
                  <FiUser className="text-zinc-400 dark:text-zinc-500 mr-4" size={20} />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-transparent w-full h-full text-zinc-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-2 tracking-wider">EMAIL ADDRESS</label>
                <div className="flex items-center bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 h-14 focus-within:border-zinc-400 dark:focus-within:border-zinc-500 transition-colors">
                  <FiMail className="text-zinc-400 dark:text-zinc-500 mr-4" size={20} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-transparent w-full h-full text-zinc-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>
              </div>
              
              <button 
                type="submit"
                className="gsap-save-btn w-full md:w-auto px-10 h-14 bg-black text-white dark:bg-white dark:text-black font-bold text-sm tracking-widest rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-lg"
              >
                SAVE PROFILE
              </button>
            </form>
          </div>
        </section>

        <hr className="border-zinc-800/50" />

        {/* Preferences */}
        <section>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-widest mb-8">PREFERENCES</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/50 p-6 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-900 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                  {isDarkMode ? <FiMoon size={20} /> : <FiSun size={20} />}
                </div>
                <div>
                  <h3 className="text-zinc-900 dark:text-white font-bold tracking-wider">Dark Mode</h3>
                  <p className="text-zinc-500 text-sm">Toggle application theme</p>
                </div>
              </div>
              <button 
                onClick={toggleDarkMode}
                className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${isDarkMode ? 'bg-zinc-200' : 'bg-black'}`}
              >
                <div className={`w-4 h-4 bg-white dark:bg-black rounded-full absolute top-1 transition-all duration-300 ${isDarkMode ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>
          </div>
        </section>

        <hr className="border-zinc-800/50" />

        {/* Danger Zone */}
        <section className="pb-20">
          <button 
            type="button"
            onClick={logout}
            className="w-full md:w-auto px-10 h-14 flex items-center justify-center gap-3 text-red-600 dark:text-red-400 border border-red-500/30 font-bold text-sm tracking-widest rounded-xl hover:bg-red-500/10 hover:border-red-500/50 transition-colors"
          >
            <FiLogOut size={18} />
            LOG OUT OF TRACKIYO
          </button>
        </section>

      </div>
    </div>
  );
};
