import { motion } from 'framer-motion';

const AppLoader = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        {/* Logo */}
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
          }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center"
        >
          <span className="text-primary-foreground font-bold text-2xl">Q</span>
        </motion.div>

        {/* Loading indicator */}
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
              className="w-2 h-2 rounded-full bg-primary"
            />
          ))}
        </div>

        <p className="text-sm text-muted-foreground">Loading...</p>
      </motion.div>
    </div>
  );
};

export default AppLoader;
