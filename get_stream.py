import sys
import json
import yt_dlp

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No query provided"}))
        return
        
    query = sys.argv[1]
    
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'skip_download': True,
        'nocheckcertificate': True,
        'referer': 'https://www.youtube.com/',
    }
    
    try:
        search_query = f"ytsearch1:{query}"
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(search_query, download=False)
            
            if 'entries' in info and len(info['entries']) > 0:
                video = info['entries'][0]
                
                formats = video.get('formats', [])
                audio_formats = [f for f in formats if f.get('acodec') != 'none' and f.get('url')]
                
                # Sort by average bitrate (abr) in descending order to get the highest quality stream
                audio_formats.sort(key=lambda f: f.get('abr', 0) or 0, reverse=True)
                
                if audio_formats:
                    best_audio = audio_formats[0]
                    direct_url = best_audio.get('url')
                else:
                    direct_url = video.get('url')
                
                title = video.get('title')
                duration = video.get('duration', 240)
                video_id = video.get('id')
                
                print(json.dumps({
                    "success": True,
                    "audio_url": direct_url,
                    "title": title,
                    "duration": duration,
                    "videoId": video_id
                }))
                return
            else:
                print(json.dumps({"success": False, "error": "No videos found"}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == '__main__':
    main()
