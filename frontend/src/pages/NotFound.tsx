import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-blue-100/30 dark:bg-blue-900/10"
            style={{
              width: `${Math.random() * 300 + 50}px`,
              height: `${Math.random() * 300 + 50}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              transition: 'transform 0.2s ease-out',
            }}
          />
        ))}
      </div>

      <motion.div
        className="w-full max-w-lg px-8 py-16 text-center relative z-10 backdrop-blur-sm bg-white/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Creative 404 text */}
        <div className="flex items-center justify-center mb-8">
          <motion.div
            className="text-9xl font-extralight tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          >
            4
          </motion.div>
          <motion.div
            className="relative w-20 h-20 mx-1"
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <div className="absolute inset-0 rounded-full border-4 border-dashed border-blue-200 dark:border-blue-800" />
            <div className="absolute inset-2 rounded-full border-4 border-dashed border-blue-400 dark:border-blue-600 opacity-75" />
            <div className="absolute inset-4 rounded-full border-4 border-dashed border-blue-600 dark:border-blue-400 opacity-50" />
          </motion.div>
          <motion.div
            className="text-9xl font-extralight tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{
              duration: 1.5,
              delay: 0.2,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          >
            4
          </motion.div>
        </div>

        {/* More elegant typography */}
        <motion.h2
          className="text-2xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          Không tìm thấy trang
        </motion.h2>

        <motion.p
          className="text-slate-600 dark:text-slate-300 mb-8 max-w-md mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          Trang bạn đang tìm kiếm đã bị lạc trong không gian mạng. Hãy để chúng tôi đưa bạn trở về nơi an toàn.
        </motion.p>

        {/* Creative button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          <Link to="/">
            <Button
              variant="outline"
              className="relative overflow-hidden group h-12 px-8 rounded-full border-2 border-blue-400 dark:border-blue-600 bg-transparent hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400 transition-all duration-300 shadow-lg hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30"
            >
              <div className="absolute inset-0 w-3 bg-blue-100 dark:bg-blue-900/30 transform -skew-x-12 -translate-x-full group-hover:translate-x-[800%] transition-transform ease-out duration-500" />
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại trang chủ
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
