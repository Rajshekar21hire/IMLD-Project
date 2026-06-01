"""AI Agent for generating data stories from air quality data"""

class StoryAgent:
    """AI-powered agent that generates narratives from air quality data"""
    
    def __init__(self):
        self.pollution_names = {
            'pm25': 'PM2.5 (Fine Particulate Matter)',
            'pm10': 'PM10 (Coarse Particulate Matter)',
            'o3': 'Ozone',
            'no2': 'Nitrogen Dioxide',
            'so2': 'Sulfur Dioxide',
            'co': 'Carbon Monoxide'
        }
        
        self.health_impacts = {
            'pm25': [
                'Reduced lung function',
                'Increased respiratory and cardiovascular symptoms',
                'Increased medication use among asthma patients',
                'Decreased activity levels',
                'Increased hospital admissions and mortality'
            ],
            'pm10': [
                'Irritation of airways',
                'Decreased lung function',
                'Aggravation of asthma',
                'Increased respiratory symptoms'
            ],
            'o3': [
                'Respiratory tract irritation',
                'Decreased lung function',
                'Asthma attacks',
                'Premature mortality'
            ],
            'no2': [
                'Airway inflammation',
                'Reduced immunity to respiratory infections',
                'Aggravation of existing asthma and other respiratory diseases'
            ],
            'so2': [
                'Bronchoconstriction',
                'Increased airway responsiveness',
                'Aggravation of asthma'
            ],
            'co': [
                'Reduced oxygen delivery to organs',
                'Cardiovascular effects',
                'Neurological effects'
            ]
        }
        
        self.aqi_descriptions = {
            'Good': 'Air quality is satisfactory and air pollution poses little or no risk.',
            'Moderate': 'Air quality is acceptable. However, there may be risk for some people, particularly those who are unusually sensitive to air pollution.',
            'Unhealthy for Sensitive Groups': 'Members of sensitive groups may experience health effects. The general public is not likely to be affected.',
            'Unhealthy': 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.',
            'Very Unhealthy': 'Health alert: The risk of health effects is increased for the general public.',
            'Hazardous': 'Health warning of emergency conditions: the entire population is more likely to be affected.'
        }
        
        self.solutions = {
            'pm25': [
                'Reduce vehicle emissions through stricter emission standards',
                'Promote renewable energy sources',
                'Implement industrial pollution controls',
                'Encourage public transportation and carpooling',
                'Plant more trees and vegetation'
            ],
            'pm10': [
                'Control construction dust through water spraying',
                'Implement traffic management strategies',
                'Reduce open burning and waste burning',
                'Improve road surface quality',
                'Implement emission standards for vehicles'
            ],
            'o3': [
                'Reduce NOx emissions from vehicles and power plants',
                'Lower VOC emissions from industrial facilities',
                'Encourage energy efficiency',
                'Promote use of renewable energy'
            ],
            'no2': [
                'Reduce traffic volume through better urban planning',
                'Promote electric vehicles',
                'Improve public transportation',
                'Implement emission controls on power plants',
                'Encourage fuel efficiency standards'
            ],
            'so2': [
                'Switch to cleaner fuels',
                'Install flue gas desulfurization systems',
                'Implement stricter industrial emission standards',
                'Promote fuel efficiency',
                'Invest in renewable energy'
            ],
            'co': [
                'Improve vehicle emission standards',
                'Promote electric vehicles',
                'Reduce traffic congestion',
                'Implement better traffic flow management',
                'Encourage walking and cycling'
            ]
        }
    
    def generate_story(self, data_list, country, city, pollution_type, time_period, statistics, trends, aqi_distribution):
        """Generate a narrative story from air quality data"""
        
        story_parts = []
        
        # Title
        title = f"Air Quality Story: {city}, {country}" if city and country else "Air Quality Analysis"
        
        # Introduction
        intro = self._generate_introduction(city, country, time_period, statistics, pollution_type)
        story_parts.append(intro)
        
        # Current situation
        current_situation = self._generate_current_situation(statistics, pollution_type, data_list)
        story_parts.append(current_situation)
        
        # Trends analysis
        if trends:
            trends_text = self._generate_trends_analysis(trends, pollution_type)
            story_parts.append(trends_text)
        
        # Health impact
        health_text = self._generate_health_impact(pollution_type, statistics)
        story_parts.append(health_text)
        
        # AQI analysis
        if aqi_distribution:
            aqi_text = self._generate_aqi_analysis(aqi_distribution)
            story_parts.append(aqi_text)
        
        # Recommendations
        recommendations = self._generate_recommendations(pollution_type, statistics)
        story_parts.append(recommendations)
        
        content = '\n\n'.join(story_parts)
        
        # Generate key insights
        key_insights = self._extract_key_insights(statistics, trends, pollution_type)
        
        # Get recommendations list
        recommendations_list = self.solutions.get(pollution_type, [])
        
        return {
            'title': title,
            'content': content,
            'summary': self._generate_summary(city, country, statistics, pollution_type),
            'key_insights': key_insights,
            'recommendations': recommendations_list
        }
    
    def _generate_introduction(self, city, city_name, time_period, statistics, pollution_type):
        """Generate introduction section"""
        pollutant_name = self.pollution_names.get(pollution_type, pollution_type)
        
        location = f"{city}, {city_name}" if city and city_name else "this region"
        
        intro = f"""## Air Quality Report for {location}

### Period: {time_period}

This comprehensive analysis examines {pollutant_name} levels in {location} over the past {time_period}. 
The data reveals important patterns and trends that affect the health and well-being of residents."""
        
        return intro
    
    def _generate_current_situation(self, statistics, pollution_type, data_list):
        """Generate current situation section"""
        if not statistics:
            return "### Current Situation\n\nInsufficient data available for analysis."
        
        pollutant_name = self.pollution_names.get(pollution_type, pollution_type)
        
        text = f"""### Current Air Quality Status

{pollutant_name} levels over the analyzed period showed the following characteristics:

- **Average Level**: {statistics['avg']:.2f} units
- **Minimum Level**: {statistics['min']:.2f} units
- **Maximum Level**: {statistics['max']:.2f} units
- **Data Points**: {statistics['count']} measurements

The current readings indicate {"GOOD" if statistics['avg'] < 50 else "MODERATE" if statistics['avg'] < 100 else "POOR"} air quality conditions."""
        
        return text
    
    def _generate_trends_analysis(self, trends, pollution_type):
        """Generate trends analysis section"""
        sorted_dates = sorted(trends.keys())
        if len(sorted_dates) < 2:
            return "### Trends\n\nInsufficient data for trend analysis."
        
        first_value = trends[sorted_dates[0]][pollution_type]
        last_value = trends[sorted_dates[-1]][pollution_type]
        
        if first_value and last_value:
            change = last_value - first_value
            direction = "increased" if change > 0 else "decreased" if change < 0 else "remained stable"
            change_pct = (change / first_value * 100) if first_value != 0 else 0
            
            text = f"""### Trends and Patterns

Over the analyzed period, pollution levels {direction} by approximately {abs(change_pct):.1f}%.

This trend suggests {"worsening air quality conditions" if change > 0 else "improving air quality conditions" if change < 0 else "stable air quality"} 
in the region, which is important for public health planning and intervention strategies."""
        else:
            text = "### Trends and Patterns\n\nInsufficient data for comprehensive trend analysis."
        
        return text
    
    def _generate_health_impact(self, pollution_type, statistics):
        """Generate health impact section"""
        impacts = self.health_impacts.get(pollution_type, [])
        pollutant_name = self.pollution_names.get(pollution_type, pollution_type)
        
        if not impacts:
            return "### Health Implications\n\nNo health impact data available."
        
        impact_text = "\n".join([f"- {impact}" for impact in impacts])
        
        text = f"""### Health Implications of {pollutant_name}

Exposure to elevated levels of {pollutant_name} can lead to various health effects:

{impact_text}

These health effects are particularly concerning for vulnerable populations including children, 
elderly individuals, and people with pre-existing respiratory or cardiovascular conditions."""
        
        return text
    
    def _generate_aqi_analysis(self, aqi_distribution):
        """Generate AQI analysis section"""
        
        dist_text = "\n".join([f"- {category}: {count} readings ({count * 100 // sum(aqi_distribution.values())}%)" 
                               for category, count in sorted(aqi_distribution.items())])
        
        text = f"""### Air Quality Index (AQI) Distribution

The distribution of AQI categories during this period:

{dist_text}

Understanding these distributions helps residents and policymakers make informed decisions 
about air quality management and public health protection."""
        
        return text
    
    def _generate_recommendations(self, pollution_type, statistics):
        """Generate recommendations section"""
        solutions = self.solutions.get(pollution_type, [])
        
        if not solutions:
            return "### Recommendations\n\nNo specific recommendations available."
        
        solutions_text = "\n".join([f"{i+1}. {solution}" for i, solution in enumerate(solutions)])
        
        text = f"""### Recommendations and Solutions

To improve air quality and reduce exposure to pollution, the following measures are recommended:

{solutions_text}

Implementing these solutions requires coordinated efforts from government agencies, industries, 
and community participation. Individual actions such as reducing vehicle use, supporting renewable 
energy initiatives, and advocating for stricter emission standards also contribute to better air quality."""
        
        return text
    
    def _generate_summary(self, city, country, statistics, pollution_type):
        """Generate a brief summary"""
        location = f"{city}, {country}" if city and country else "this region"
        
        if not statistics:
            return f"Air quality analysis for {location}."
        
        pollutant_name = self.pollution_names.get(pollution_type, pollution_type)
        status = "GOOD" if statistics['avg'] < 50 else "MODERATE" if statistics['avg'] < 100 else "POOR"
        
        return f"Analysis of {pollutant_name} levels in {location} reveals {status.lower()} air quality conditions with an average level of {statistics['avg']:.2f} units."
    
    def _extract_key_insights(self, statistics, trends, pollution_type):
        """Extract key insights from data"""
        insights = []
        
        if statistics:
            insights.append(f"Average pollution level: {statistics['avg']:.2f} units")
            insights.append(f"Peak level recorded: {statistics['max']:.2f} units")
        
        if trends:
            sorted_dates = sorted(trends.keys())
            if len(sorted_dates) >= 2:
                first_val = trends[sorted_dates[0]][pollution_type]
                last_val = trends[sorted_dates[-1]][pollution_type]
                if first_val and last_val:
                    change_pct = ((last_val - first_val) / first_val * 100) if first_val != 0 else 0
                    insights.append(f"Trend: {abs(change_pct):.1f}% {'increase' if change_pct > 0 else 'decrease'}")
        
        return insights if insights else ["Data analysis completed"]
