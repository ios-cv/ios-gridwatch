package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const generation_metric_name = "total_import"
const generation_metric = generation_metric_name + "{purpose=\"solar\"}"
const actual_power_metric_name = "total_act_power"
const actual_power_metric = actual_power_metric_name + "{purpose=\"solar\"}"

type SolarData struct {
	Total_kwh float32    `json:"total_kwh"`
	Day_kwh   float32    `json:"day_kwh"`
	Week_kwh  float32    `json:"week_kwh"`
	Year_kwh  float32    `json:"year_kwh"`
	Current_w float32    `json:"current_w"`
	Sites     []SiteData `json:"sites"`
}

type SiteData struct {
	Name     string  `json:"name"`
	Snapshot float64 `json:"snapshot"`
	Today    float64 `json:"today"`
	Week     float64 `json:"week"`
	Last_365 float64 `json:"year"`
	Max      float64 `json:"max"`
}

func get_solar_data(username string, password string, prometheusURL string, estDNC int, monitoredDNC int) (SolarData, error) {
	var sites []SiteData
	now := time.Now()
	//year, month, day := now.Date()
	//location := now.Location()
	//midnight := time.Date(year, month, day, 0, 0, 0, 0, location)
	//week := midnight.Add(-7 * 24 * time.Hour)
	//one_year_ago := time.Date(year-1, month, day, 0, 0, 0, 0, location)
	//timeFormat := "2006-01-02T15:04:05Z"
	seconds_since_midnight_int := now.Hour()*3600 + now.Minute()*60 + now.Second()
	//seconds_since_last_week_int := 7 * 24 * 60 * 60
	seconds_since_midnight := strconv.FormatInt(int64(seconds_since_midnight_int), 10) + "s"
	//seconds_since_last_week := strconv.FormatInt(int64(seconds_since_last_week_int), 10) + "s"

	//get last 365 days statistics
	increase_year, err := fetchPrometheusIncrease(username, password, prometheusURL, generation_metric, "365d")
	if err != nil {
		log.Printf("Error fetching old meter readings: %v\n", err)
		return SolarData{}, err
	}
	var year_total float64

	for _, site := range increase_year {
		if len(sites) == 0 {
			sites = append(sites, SiteData{Name: site.Metric.Site, Last_365: site.GetValue()})
			year_total += site.GetValue()
		} else {
			for i := range sites {
				if sites[i].Name == site.Metric.Site {
					sites[i].Last_365 = site.GetValue()
					year_total += site.GetValue()
					break
				} else if i == len(sites)-1 {
					sites = append(sites, SiteData{Name: site.Metric.Site, Last_365: site.GetValue()})
					year_total += site.GetValue()
				}
			}
		}
	}

	//get weekly stistics
	increase_week, err := fetchPrometheusIncrease(username, password, prometheusURL, generation_metric, "7d")
	if err != nil {
		log.Printf("Error fetching old meter readings: %v\n", err)
		return SolarData{}, err
	}
	var week_total float64

	for _, site := range increase_week {
		for i := range sites {
			if sites[i].Name == site.Metric.Site {
				sites[i].Week = site.GetValue()
				week_total += site.GetValue()
				break
			} else if i == len(sites)-1 {
				sites = append(sites, SiteData{Name: site.Metric.Site, Week: site.GetValue()})
				week_total += site.GetValue()
			}
		}
	}

	//get statistics for today
	increase_day, err := fetchPrometheusIncrease(username, password, prometheusURL, generation_metric, seconds_since_midnight)
	if err != nil {
		log.Printf("Error fetching old meter readings: %v\n", err)
		return SolarData{}, err
	}
	var day_total float64

	for _, site := range increase_day {
		for i := range sites {
			if sites[i].Name == site.Metric.Site {
				sites[i].Today = site.GetValue()
				day_total += site.GetValue()
				break
			} else if i == len(sites)-1 {
				sites = append(sites, SiteData{Name: site.Metric.Site, Today: site.GetValue()})
				day_total += site.GetValue()
			}
		}
	}

	//get max statistics
	query := fmt.Sprintf("max_over_time(%s[1y])", actual_power_metric)
	max_data, err := fetchPrometheusSnapshotData(username, password, prometheusURL, query, "")
	if err != nil {
		log.Printf("Error fetching current output: %v\n", err)
		return SolarData{}, err
	}

	for _, site := range max_data {
		for i := range sites {
			if sites[i].Name == site.Metric.Site {
				sites[i].Max = site.GetValue()
				break
			} else if i == len(sites)-1 {
				max_watts, _ := strconv.ParseFloat(site.Value[1].(string), 64)
				sites = append(sites, SiteData{Name: site.Metric.Site, Max: max_watts})
			}
		}
	}

	//get snapshot statistics
	latest_data, err := fetchPrometheusSnapshotData(username, password, prometheusURL, actual_power_metric, "")
	if err != nil {
		log.Printf("Error fetching current output: %v\n", err)
		return SolarData{}, err
	}
	latest_total_watts := 0.0

	for _, site := range latest_data {
		for i := range sites {
			if sites[i].Name == site.Metric.Site {
				sites[i].Snapshot = site.GetValue()
				latest_total_watts += sites[i].Snapshot
				break
			} else if i == len(sites)-1 {
				site_watts, _ := strconv.ParseFloat(site.Value[1].(string), 64)
				sites = append(sites, SiteData{Name: site.Metric.Site, Snapshot: site_watts})
				latest_total_watts += site_watts
			}
		}
	}

	//all time data
	query = fmt.Sprintf("sum(last_over_time(%s[1y]))", generation_metric)
	all_time_data, err := fetchPrometheusVectorQuery(username, password, prometheusURL, query)
	if err != nil {
		log.Printf("Error fetching current output: %v\n", err)
		return SolarData{}, err
	}

	//create a virtual site to represent unmonitored sites
	//calculate the average of each value for the sites
	var virtualSite SiteData

	conversionFactor := float64(estDNC) / float64(monitoredDNC)
	if len(sites) >= 0 {
		for _, site := range sites {
			virtualSite.Snapshot += site.Snapshot
			virtualSite.Week += site.Week
			virtualSite.Today += site.Today
			virtualSite.Last_365 += site.Last_365
			virtualSite.Max += site.Max
		}
		virtualSite.Snapshot *= conversionFactor
		virtualSite.Today *= conversionFactor
		virtualSite.Week *= conversionFactor
		virtualSite.Last_365 *= conversionFactor
		virtualSite.Max *= conversionFactor
	}
	virtualSite.Name = "Unmonitored (estimated)"

	sites = append(sites, virtualSite)
	week_total += virtualSite.Week
	day_total += virtualSite.Today
	latest_total_watts += virtualSite.Snapshot

	return SolarData{
		Total_kwh: float32(all_time_data.GetValue()),
		Week_kwh:  float32(week_total),
		Day_kwh:   float32(day_total),
		Year_kwh:  float32(year_total),
		Current_w: float32(latest_total_watts),
		Sites:     sites}, nil
}

type PrometheusSnapshotResponse struct {
	Data struct {
		Result []PrometheusSnapshotData `json:"result"`
	} `json:"data"`
}

type PrometheusVectorResponse struct {
	Data struct {
		Result []PrometheusVectorData `json:"result"`
	} `json:"data"`
}

type PrometheusSnapshotData struct {
	Metric struct {
		Site string `json:"site"`
	} `json:"metric"`
	Value []interface{} `json:"value"`
}

type PrometheusVectorData struct {
	Value []interface{} `json:"value"`
}

func (p PrometheusSnapshotData) GetValue() float64 {
	value, _ := strconv.ParseFloat(p.Value[1].(string), 64)
	return value
}
func (p PrometheusVectorData) GetValue() float64 {
	value, _ := strconv.ParseFloat(p.Value[1].(string), 64)
	return value
}

type PrometheusRangeResponse struct {
	Data struct {
		Result []PrometheusRangeData `json:"result"`
	} `json:"data"`
}

type PrometheusRangeData struct {
	Metric struct {
		Name string `json:"__name__"`
		Site string `json:"site"`
	} `json:"metric"`
	Values [][]interface{} `json:"values"`
}

func (p PrometheusRangeData) GetValues() (return_values []float64) {
	for _, value := range p.Values {
		v, _ := strconv.ParseFloat(value[1].(string), 64)
		return_values = append(return_values, v)
	}
	return return_values
}

func fetchPrometheusSnapshotData(username string, password string, prometheusURL string, metric string, age string) ([]PrometheusSnapshotData, error) {
	params := url.Values{}
	params.Add("query", metric)
	if age != "" {
		params.Add("offset", age)
	}
	queryURL := prometheusURL + "?" + params.Encode()
	req, err := http.NewRequest("GET", queryURL, nil)
	if err != nil {
		return []PrometheusSnapshotData{}, err
	}
	req.SetBasicAuth(username, password)
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return []PrometheusSnapshotData{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return []PrometheusSnapshotData{}, err
	}
	var promResp PrometheusSnapshotResponse
	err = json.Unmarshal(body, &promResp)
	if err != nil {
		return []PrometheusSnapshotData{}, err
	}
	return promResp.Data.Result, nil
}

func fetchPrometheusQuery(username string, password string, prometheusURL string, query string) ([]PrometheusSnapshotData, error) {
	params := url.Values{}
	params.Add("query", query)
	queryURL := prometheusURL + "?" + params.Encode()
	req, err := http.NewRequest("GET", queryURL, nil)
	if err != nil {
		return []PrometheusSnapshotData{}, err
	}
	req.SetBasicAuth(username, password)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return []PrometheusSnapshotData{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return []PrometheusSnapshotData{}, err
	}
	var promResp PrometheusSnapshotResponse
	err = json.Unmarshal(body, &promResp)
	if err != nil {
		log.Printf("%+v", string(body))
		return []PrometheusSnapshotData{}, err
	}
	return promResp.Data.Result, nil
}

func fetchPrometheusVectorQuery(username string, password string, prometheusURL string, query string) (PrometheusVectorData, error) {
	params := url.Values{}
	params.Add("query", query)
	queryURL := prometheusURL + "?" + params.Encode()
	req, err := http.NewRequest("GET", queryURL, nil)
	if err != nil {
		return PrometheusVectorData{}, err
	}
	req.Header.Set("Accept", "application/json")
	req.SetBasicAuth(username, password)
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return PrometheusVectorData{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return PrometheusVectorData{}, err
	}
	var promResp PrometheusVectorResponse
	err = json.Unmarshal(body, &promResp)
	if err != nil {
		return PrometheusVectorData{}, err
	}
	if len(promResp.Data.Result) == 0 {
		return PrometheusVectorData{}, errors.New("error with prometheus query")
	}
	return promResp.Data.Result[0], nil
}

func fetchPrometheusIncrease(username string, password string, prometheusURL string, metric string, period string) ([]PrometheusSnapshotData, error) {
	query := fmt.Sprintf("delta(%s[%s])", metric, period)
	params := url.Values{}
	params.Add("query", query)
	queryURL := prometheusURL + "?" + params.Encode()
	req, err := http.NewRequest("GET", queryURL, nil)
	if err != nil {
		return []PrometheusSnapshotData{}, err
	}
	req.SetBasicAuth(username, password)
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return []PrometheusSnapshotData{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return []PrometheusSnapshotData{}, err
	}
	var promResp PrometheusSnapshotResponse
	err = json.Unmarshal(body, &promResp)
	if err != nil {
		return []PrometheusSnapshotData{}, err
	}
	return promResp.Data.Result, nil
}

func fetchPrometheusDataRange(username string, password string, prometheusURL string, query, start, end, step string) ([]PrometheusRangeData, error) {
	// Build API request
	params := url.Values{}
	params.Add("query", query)
	params.Add("start", start+"Z")
	params.Add("end", end+"Z")
	params.Add("step", step)
	queryURL := prometheusURL + "_range?" + params.Encode()
	req, err := http.NewRequest("GET", queryURL, nil)
	if err != nil {
		return []PrometheusRangeData{}, err
	}
	req.SetBasicAuth(username, password)
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return []PrometheusRangeData{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return []PrometheusRangeData{}, err
	}

	// Parse JSON response
	var promResp PrometheusRangeResponse
	err = json.Unmarshal(body, &promResp)
	if err != nil {
		return []PrometheusRangeData{}, err
	}

	return promResp.Data.Result, nil
}

func fetchPrometheusRangeQuery(username string, password string, prometheusURL string, query string) ([]PrometheusRangeData, error) {
	params := url.Values{}
	params.Add("query", query)
	queryURL := prometheusURL + "?" + params.Encode()
	req, err := http.NewRequest("GET", queryURL, nil)
	if err != nil {
		return []PrometheusRangeData{}, err
	}
	req.SetBasicAuth(username, password)
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return []PrometheusRangeData{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return []PrometheusRangeData{}, err
	}
	var promResp PrometheusRangeResponse
	err = json.Unmarshal(body, &promResp)
	if err != nil {
		return []PrometheusRangeData{}, err
	}
	return promResp.Data.Result, nil
}

type SitePeriodData struct {
	Name    string          `json:"name"`
	Meter   float64         `json:"meter"`
	Current float64         `json:"current"`
	Period  float64         `json:"generation_in_period"`
	Max     float64         `json:"max"`
	Data    [][]interface{} `json:"data"`
}

type PeriodDataResponse struct {
	Status string `json:"status"`
	Data   struct {
		ResultType string       `json:"resultType"`
		Result     []PeriodData `json:"result"`
	} `json:"data"`
}

type PeriodData struct {
	Metric struct{}        `json:"metric"`
	Values [][]interface{} `json:"values"`
}

func FetchTodaysGenerationData(username string, password string, prometheusURL string) (periodData PeriodData, err error) {
	now := time.Now()
	query := fmt.Sprintf("sum(avg_over_time(%s[30m]))", actual_power_metric)
	params := url.Values{}
	params.Add("query", query)
	params.Add("start", string(now.Format("2006-01-02T00:00:00"))+"Z")
	params.Add("end", string(now.Format("2006-01-02T15:04:05"))+"Z")
	params.Add("step", "1800")
	queryURL := prometheusURL + "_range?" + params.Encode()
	req, err := http.NewRequest("GET", queryURL, nil)
	if err != nil {
		return PeriodData{}, err
	}
	req.SetBasicAuth(username, password)
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return PeriodData{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return PeriodData{}, err
	}

	// Parse JSON response
	var promResp PeriodDataResponse
	err = json.Unmarshal(body, &promResp)
	if err != nil {
		return PeriodData{}, err
	}
	if len(promResp.Data.Result) > 0 {
		return promResp.Data.Result[0], nil
	} else {
		return PeriodData{}, fmt.Errorf("empty dataset for query:%s", query)
	}
}

func FetchSitePeriodData(username string, password string, prometheusURL string, site string, numberOfDays int) (sitePeriodData SitePeriodData, err error) {
	var query1, query2, query3, query4, query5 string
	sitePeriodData.Name = strings.ReplaceAll(site, "+", " ")
	if sitePeriodData.Name != "" {
		query1 = fmt.Sprintf("%s{purpose=\"solar\", site=\"%s\"}", generation_metric_name, sitePeriodData.Name)
		query2 = fmt.Sprintf("%s{purpose=\"solar\", site=\"%s\"}", actual_power_metric_name, sitePeriodData.Name)
		if numberOfDays < 1 {
			numberOfDays = 1
		}
		var resolution string
		switch {
		case numberOfDays <= 1:
			resolution = "1m"
		case numberOfDays <= 7:
			resolution = "15m"
		case numberOfDays <= 31:
			resolution = "3h"
		default:
			resolution = "24h"
		}
		query3 = fmt.Sprintf("avg_over_time(%s{purpose=\"solar\", site=\"%s\"}[%s])[%vd:%s]", actual_power_metric_name, sitePeriodData.Name, resolution, numberOfDays, resolution)
		query4 = fmt.Sprintf("delta(%s{purpose=\"solar\", site=\"%s\"}[%vd])", generation_metric_name, sitePeriodData.Name, numberOfDays)
		query5 = fmt.Sprintf("max_over_time(%s{purpose=\"solar\", site=\"%s\"}[%vd])", actual_power_metric_name, sitePeriodData.Name, numberOfDays)
	} else {
		return SitePeriodData{}, errors.New("you must include a site name")
	}
	meter, err := fetchPrometheusQuery(username, password, prometheusURL, query1)
	if err != nil {
		log.Printf("Query 1 error - %s", query1)
		return sitePeriodData, err
	}
	if len(meter) < 1 {
		return sitePeriodData, errors.New("site: " + site + " - not found")
	}
	sitePeriodData.Meter = meter[0].GetValue()

	current_generation, err := fetchPrometheusQuery(username, password, prometheusURL, query2)
	if err != nil {
		log.Printf("Query 2 error - %s", query2)
		return sitePeriodData, err
	}
	sitePeriodData.Current = current_generation[0].GetValue()

	data, err := fetchPrometheusRangeQuery(username, password, prometheusURL, query3)
	if err != nil {
		log.Printf("Query 3 error - %s", query3)
		return sitePeriodData, err
	}
	sitePeriodData.Data = data[0].Values

	period_generation, err := fetchPrometheusQuery(username, password, prometheusURL, query4)
	if err != nil {
		log.Printf("Query 4 error - %s", query4)
		return sitePeriodData, err
	}
	sitePeriodData.Period = period_generation[0].GetValue()

	maximum, err := fetchPrometheusQuery(username, password, prometheusURL, query5)
	if err != nil {
		log.Printf("Query 5 error - %s", query5)
		return sitePeriodData, err
	}
	sitePeriodData.Max = maximum[0].GetValue()

	return
}

func FetchPeriodData(username string, password string, prometheusURL string, numberOfDays int) (sitePeriodData []SitePeriodData, err error) {
	var query1, query2, query3, query4, query5 string
	query1 = fmt.Sprintf("last_over_time(%s[1y])", generation_metric)
	query2 = fmt.Sprintf("last_over_time(%s[1y])", actual_power_metric)
	if numberOfDays < 1 {
		numberOfDays = 1
	}
	var resolution string
	switch {
	case numberOfDays <= 1:
		resolution = "1m"
	case numberOfDays <= 7:
		resolution = "15m"
	case numberOfDays <= 31:
		resolution = "3h"
	default:
		resolution = "24h"
	}
	query3 = fmt.Sprintf("avg_over_time(%s[%s])[%vd:%s]", actual_power_metric, resolution, numberOfDays, resolution)
	query4 = fmt.Sprintf("delta(%s[%vd])", generation_metric, numberOfDays)
	query5 = fmt.Sprintf("max_over_time(%s[%vd])", actual_power_metric, numberOfDays)

	meter, err := fetchPrometheusQuery(username, password, prometheusURL, query1)
	if err != nil {
		return sitePeriodData, err
	}
	if len(meter) < 1 {
		return sitePeriodData, errors.New("no results found")
	}
	for _, v := range meter {
		siteData := SitePeriodData{Name: v.Metric.Site, Meter: v.GetValue()}
		sitePeriodData = append(sitePeriodData, siteData)
	}

	current_generation, err := fetchPrometheusQuery(username, password, prometheusURL, query2)
	if err != nil {
		return sitePeriodData, err
	}

	for _, v := range current_generation {
		for i := range sitePeriodData {
			if sitePeriodData[i].Name == v.Metric.Site {
				sitePeriodData[i].Current = v.GetValue()
				break
			}
		}
	}

	data, err := fetchPrometheusRangeQuery(username, password, prometheusURL, query3)
	if err != nil {
		return sitePeriodData, err
	}

	for _, v := range data {
		for i := range sitePeriodData {
			if sitePeriodData[i].Name == v.Metric.Site {
				sitePeriodData[i].Data = v.Values
				break
			}
		}
	}

	period_generation, err := fetchPrometheusQuery(username, password, prometheusURL, query4)
	if err != nil {
		return sitePeriodData, err
	}

	for _, v := range period_generation {
		for i := range sitePeriodData {
			if sitePeriodData[i].Name == v.Metric.Site {
				sitePeriodData[i].Period = v.GetValue()
				break
			}
		}
	}

	maximum, err := fetchPrometheusQuery(username, password, prometheusURL, query5)
	if err != nil {
		return sitePeriodData, err
	}

	for _, v := range maximum {
		for i := range sitePeriodData {
			if sitePeriodData[i].Name == v.Metric.Site {
				sitePeriodData[i].Max = v.GetValue()
				break
			}
		}
	}

	return
}
