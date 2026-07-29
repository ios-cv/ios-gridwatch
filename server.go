package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

var Reset = "\033[0m"
var Red = "\033[31m"
var Green = "\033[32m"
var Yellow = "\033[33m"
var Blue = "\033[34m"
var Magenta = "\033[35m"
var Cyan = "\033[36m"
var Gray = "\033[37m"
var White = "\033[97m"

func main() {
	port_env := os.Getenv("GRIDWATCH_PORT")
	if port_env == "" {
		port_env = "1323"
	}
	port := flag.String("port", port_env, "Port to run on")

	host_env := os.Getenv("GRIDWATCH_HOST")
	if host_env == "" {
		host_env = "localhost"
	}
	host := flag.String("host", host_env, "Host to listen on")

	username_env := os.Getenv("GRIDWATCH_USERNAME")
	if username_env == "" {
		username_env = "admin"
	}
	username := flag.String("username", username_env, "Username for Prometheus Server")

	password_env := os.Getenv("GRIDWATCH_PASSWORD")
	if password_env == "" {
		password_env = "password"
	}
	password := flag.String("password", password_env, "Password for Prometheus Server")

	prom_url_env := os.Getenv("GRIDWATCH_PROM_URL")
	if prom_url_env == "" {
		prom_url_env = "http://localhost:9090"
	}
	prom_url := flag.String("prometheus", prom_url_env, "URL for Prometheus Server")

	est_DNC_env := os.Getenv("GRIDWATCH_ESTIMATED_DNC")
	if est_DNC_env == "" {
		est_DNC_env = "500"
	}

	est_DNC_flag := flag.String("estimate", est_DNC_env, "Estimated unmonitored solar capacity in kilowatts")
	est_DNC, err := strconv.Atoi(*est_DNC_flag)
	if err != nil {
		est_DNC = 500
	}

	monitored_DNC_env := os.Getenv("GRIDWATCH_DNC")
	if monitored_DNC_env == "" {
		monitored_DNC_env = "20"
	}
	monitored_DNC_flag := flag.String("dnc", monitored_DNC_env, "Monitored solar capacity in kilowatts")
	monitored_DNC, err := strconv.Atoi(*monitored_DNC_flag)
	if err != nil {
		monitored_DNC = 20
	}

	monitored_count_env := os.Getenv("GRIDWATCH_MONITORED_COUNT")
	if monitored_count_env == "" {
		monitored_count_env = "1"
	}
	monitored_count_flag := flag.String("sitecount", monitored_count_env, "The number of sites that it is expected to get data from.")
	monitored_count, err := strconv.Atoi(*monitored_count_flag)
	if err != nil {
		monitored_count = 1
	}

	update_time_env := os.Getenv("GRIDWATCH_UPDATE_TIME")
	if update_time_env == "" {
		update_time_env = "60"
	}
	update_time_flag := flag.String("updatetime", update_time_env, "How many seconds between server sent updates.")
	update_time, err := strconv.Atoi(*update_time_flag)
	if err != nil {
		update_time = 60
	}
	energy_local_sites_env := os.Getenv("GRIDWATCH_ENERGY_LOCAL_SITES")
	if energy_local_sites_env == "" {
		energy_local_sites_env = ""
	}
	energy_local_sites_flag := flag.String("energylocalsites", energy_local_sites_env, "Comma separated list of Energy Local sites to pull data for energy local endpoints.")
	var energy_local_sites []string

	flag.Parse()
	if len(*energy_local_sites_flag) > 0 {
		fmt.Println(*energy_local_sites_flag)
		for _, v := range strings.Split(*energy_local_sites_flag, ",") {
			energy_local_sites = append(energy_local_sites, strings.TrimSpace(v))
		}
	}

	e := echo.New()
	e.HideBanner = true
	fmt.Println(` ___  ________  ________  ________  ___      ___                         ________  ________  ___  ________  ___       __   ________  _________  ________  ___  ___`)
	fmt.Println(`|\  \|\   __  \|\   ____\|\   ____\|\  \    /  /|                       |\   ____\|\   __  \|\  \|\   ___ \|\  \     |\  \|\   __  \|\___   ___\\   ____\|\  \|\  \`)
	fmt.Println(`\ \  \ \  \|\  \ \  \___|\ \  \___|\ \  \  /  / /     ____________      \ \  \___|\ \  \|\  \ \  \ \  \_|\ \ \  \    \ \  \ \  \|\  \|___ \  \_\ \  \___|\ \  \\\  \`)
	fmt.Println(` \ \  \ \  \\\  \ \_____  \ \  \    \ \  \/  / /     |\____________\     \ \  \  __\ \   _  _\ \  \ \  \ \\ \ \  \  __\ \  \ \   __  \   \ \  \ \ \  \    \ \   __  \`)
	fmt.Println(`  \ \  \ \  \\\  \|____|\  \ \  \____\ \    / /      \|____________|      \ \  \|\  \ \  \\  \\ \  \ \  \_\\ \ \  \|\__\_\  \ \  \ \  \   \ \  \ \ \  \____\ \  \ \  \`)
	fmt.Println(`   \ \__\ \_______\____\_\  \ \_______\ \__/ /                             \ \_______\ \__\\ _\\ \__\ \_______\ \____________\ \__\ \__\   \ \__\ \ \_______\ \__\ \__\`)
	fmt.Println(`    \|__|\|_______|\_________\|_______|\|__|/                               \|_______|\|__|\|__|\|__|\|_______|\|____________|\|__|\|__|    \|__|  \|_______|\|__|\|__|`)
	fmt.Println(`                  \|_________|`)

	host_rune_count := len(*host)
	additionalPadding := "           "
	padding := ""
	for len(padding) < 50-host_rune_count {
		padding += " "
	}
	fmt.Printf(Blue+"\n%s%s:%s\n"+Reset, padding+additionalPadding, *host, *port)
	fmt.Printf("\n       Monitoring %v solar sites with a DNC of "+Red+"%vkW"+Reset+", extrapolating for a total islands solar capacity of "+Red+"%vkW"+Reset+"\n", monitored_count, monitored_DNC, est_DNC)
	fmt.Printf("\n                                     Updating via server sent events every "+Red+"%v seconds\n\n%s"+Reset, update_time, padding)
	for _, site := range energy_local_sites {
		fmt.Printf("                                          Added Energy Local site: "+Green+"%s\n"+Reset, site)
	}
	e.Use(middleware.Recover())

	e.GET("/sse", func(c echo.Context) error {
		log.Printf("SSE client connected, ip:%v", c.RealIP())
		w := c.Response()
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		send := func() error {
			solarData, err := get_solar_data(*username, *password, *prom_url, est_DNC, monitored_DNC)
			if err != nil {
				log.Print("Error:", err)
				return err
			}
			data, jsonErr := json.Marshal(solarData)
			if jsonErr != nil {
				log.Print("Error:", jsonErr)
				return jsonErr
			}
			event := Event{
				Data: []byte(data),
			}
			if err := event.MarshalTo(w); err != nil {
				return err
			}
			w.Flush()
			return nil
		}

		// send initial event
		if err := send(); err != nil {
			return nil
		}

		ticker := time.NewTicker(time.Duration(update_time) * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-c.Request().Context().Done():
				log.Printf("SSE client disconnected, ip:%v", c.RealIP())
				return nil
			case <-ticker.C:
				if err := send(); err != nil {
					return nil
				}
			}
		}
	})

	var validSite = regexp.MustCompile(`^[a-zA-Z0-9_+-]+$`)

	e.GET("/site/:site/:period", func(c echo.Context) error {
		siteName := c.Param("site")
		if !validSite.MatchString(siteName) {
			log.Print("Error: Bad Route")
			return c.JSON(http.StatusBadRequest, map[string]string{"message": "bad route"})
		}
		period, err := strconv.ParseInt(c.Param("period"), 10, 64)
		w := c.Response()
		w.Header().Set("Access-Control-Allow-Origin", "*")

		if err != nil {
			log.Print("Error: ", err)
			return c.JSON(http.StatusBadRequest, map[string]string{"message": "bad period"})
		}

		if siteName == "all" {
			site_data, err := FetchPeriodData(*username, *password, *prom_url, int(period))
			if err != nil {
				log.Print("Error: ", err)
				return c.JSON(http.StatusBadGateway, map[string]string{"message": "bad query"})
			}

			return c.JSON(http.StatusOK, site_data)
		} else {
			site_data, err := FetchSitePeriodData(*username, *password, *prom_url, siteName, int(period))
			if err != nil {
				log.Print("Error: ", err)
				return c.JSON(http.StatusBadGateway, map[string]string{"message": "bad query"})
			}

			return c.JSON(http.StatusOK, site_data)
		}
	})

	e.GET("/site/all", func(c echo.Context) error {
		w := c.Response()
		w.Header().Set("Access-Control-Allow-Origin", "*")

		site_data, err := FetchTodaysGenerationData(*username, *password, *prom_url, est_DNC, monitored_DNC)
		if err != nil {
			if strings.Contains(err.Error(), "empty dataset") {
				return c.JSON(http.StatusOK, PeriodData{})
			}
			log.Print("Error: ", err)
			return c.JSON(http.StatusBadGateway, map[string]string{"message": "bad query"})
		}

		return c.JSON(http.StatusOK, site_data)
	})

	e.GET("/setup", func(c echo.Context) error {
		w := c.Response()
		w.Header().Set("Access-Control-Allow-Origin", "*")

		setup_data := setupData{
			SiteCount:      CountSites(*username, *password, *prom_url),
			MonitoredCount: monitored_count,
			Dnc:            monitored_DNC,
			Enc:            est_DNC,
			UpdateTime:     update_time,
		}
		return c.JSON(http.StatusOK, setup_data)
	})

	e.GET("/health", func(c echo.Context) error {
		w := c.Response()
		w.Header().Set("Access-Control-Allow-Origin", "*")

		status := monitored_count == CountSites(*username, *password, *prom_url)

		if status {
			return c.Blob(http.StatusOK, "", []byte("1"))
		}

		return c.Blob(http.StatusOK, "", []byte("0"))
	})

	e.GET("/energylocalday", func(c echo.Context) error {
		w := c.Response()
		w.Header().Set("Access-Control-Allow-Origin", "*")

		data, err := GetEnergyLocalDay(*username, *password, *prom_url, energy_local_sites)
		if err != nil {
			log.Print("Error: ", err)
			return c.JSON(http.StatusBadGateway, map[string]string{"message": "bad query"})
		}

		return c.JSON(http.StatusOK, data)
	})

	e.GET("/energylocalinstant", func(c echo.Context) error {
		w := c.Response()
		w.Header().Set("Access-Control-Allow-Origin", "*")

		data, timestamp, err := GetEnergyLocalWattage(*username, *password, *prom_url, energy_local_sites)
		if err != nil {
			log.Print("Error: ", err)
			return c.JSON(http.StatusBadGateway, map[string]string{"message": "bad query"})
		}
		return c.JSON(http.StatusOK, map[string]interface{}{"snapshot_watts": data, "snapshot_time": timestamp})
	})

	listen_on := fmt.Sprintf("%s:%s", *host, *port)
	e.Logger.Fatal(e.Start(listen_on))
}

type setupData struct {
	SiteCount      int `json:"siteCount"`
	MonitoredCount int `json:"monitoredCount"`
	Dnc            int `json:"dnc"`
	Enc            int `json:"enc"`
	UpdateTime     int `json:"updateTime"`
}
