import os
import sys
import pandas as pd
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go

# Add current dir and parent to system path
sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import config_loader

# Configure page settings
st.set_page_config(
    page_title="LIET Performance Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom premium styling
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Outfit', sans-serif;
    }
    
    .main-title {
        font-size: 2.8rem;
        font-weight: 800;
        background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #f59e0b 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.5rem;
    }
    
    .subtitle {
        font-size: 1.1rem;
        color: #9ca3af;
        margin-bottom: 2rem;
    }
    
    .kpi-card {
        background-color: #1e293b;
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 1.5rem;
        text-align: center;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    
    .kpi-val {
        font-size: 2rem;
        font-weight: 700;
        color: #ffffff;
        margin-top: 0.5rem;
    }
    
    .kpi-label {
        font-size: 0.85rem;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
</style>
""", unsafe_allow_html=True)

# Load data helper
def load_data():
    master_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'output', 'master_performance.csv'))
    rankings_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'output', 'final_rankings.csv'))
    summary_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'output', 'module_summary.csv'))
    
    if not os.path.exists(master_path) or not os.path.exists(rankings_path):
        return None, None, None
        
    df_master = pd.read_csv(master_path)
    df_rankings = pd.read_csv(rankings_path)
    df_summary = pd.read_csv(summary_path)
    return df_master, df_rankings, df_summary

def main():
    st.markdown("<h1 class='main-title'>Training Performance Analytics</h1>", unsafe_allow_html=True)
    st.markdown("<p class='subtitle'>Lloyd Institute of Engineering & Technology — ML and Agentic AI Summer Training</p>", unsafe_allow_html=True)
    
    df_master, df_rankings, df_summary = load_data()
    
    if df_master is None:
        st.warning("⚠️ No performance data found. Please run the data generator and processor first.")
        st.info("💡 You can run `python main.py --mock-data` followed by `python main.py --run` to populate this dashboard.")
        return
        
    config = config_loader.load_config()
    quizzes = config_loader.get_all_quizzes(config)
    
    # ------------------ KPI Overview Cards ------------------
    total_students = len(df_rankings)
    avg_score_pct = df_rankings["Cumulative_Pct"].mean()
    highest_score_pct = df_rankings["Cumulative_Pct"].max()
    pass_rate = (df_rankings["Grade"] != "F").sum() / total_students * 100
    
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown(f"""
        <div class="kpi-card">
            <div class="kpi-label">Total Enrolled</div>
            <div class="kpi-val">{total_students}</div>
        </div>
        """, unsafe_allow_html=True)
    with col2:
        st.markdown(f"""
        <div class="kpi-card">
            <div class="kpi-label">Average Performance</div>
            <div class="kpi-val">{avg_score_pct:.1f}%</div>
        </div>
        """, unsafe_allow_html=True)
    with col3:
        st.markdown(f"""
        <div class="kpi-card">
            <div class="kpi-label">Highest Score</div>
            <div class="kpi-val">{highest_score_pct:.1f}%</div>
        </div>
        """, unsafe_allow_html=True)
    with col4:
        st.markdown(f"""
        <div class="kpi-card">
            <div class="kpi-label">Passing Rate</div>
            <div class="kpi-val">{pass_rate:.1f}%</div>
        </div>
        """, unsafe_allow_html=True)
        
    st.write("")
    st.write("")
    
    # ------------------ Tabs for Sections ------------------
    tab_rankings, tab_analytics, tab_weak_students, tab_student_lookup = st.tabs([
        "🏆 Top Performers & Rankings", 
        "📊 Module & Grade Analytics", 
        "⚠️ Remedial Finder (Weak Students)", 
        "🔍 Individual Student Lookup"
    ])
    
    # Tab 1: Rankings
    with tab_rankings:
        st.subheader("Leaderboard & Overall Rankings")
        st.markdown("This list is sorted by rank and computed based on overall cumulative percentage scores across all modules.")
        
        # Style dataframe displays
        display_cols = ["Rank", "Name", "Email", "Cumulative_Score", "Cumulative_Max", "Cumulative_Pct", "Final_Percentile", "Grade"]
        df_rankings_display = df_rankings[display_cols].copy()
        df_rankings_display.columns = ["Rank", "Name", "Email Address", "Marks", "Max Marks", "Percentage", "Overall Percentile", "Grade"]
        
        # Color coding grading scales
        st.dataframe(
            df_rankings_display.style.format({
                "Percentage": "{:.2f}%",
                "Overall Percentile": "{:.2f}%",
                "Marks": "{:.1f}",
                "Max Marks": "{:.1f}"
            }).background_gradient(subset=["Percentage"], cmap="plasma"),
            use_container_width=True,
            hide_index=True
        )
        
    # Tab 2: Analytics
    with tab_analytics:
        col_chart1, col_chart2 = st.columns(2)
        
        with col_chart1:
            st.subheader("Grade Distribution")
            grade_counts = df_rankings["Grade"].value_counts().reset_index()
            grade_counts.columns = ["Grade", "Count"]
            
            # Sort grade counts logically
            grade_order = ["A+", "A", "B", "C", "D", "F"]
            grade_counts["Grade"] = pd.Categorical(grade_counts["Grade"], categories=grade_order, ordered=True)
            grade_counts = grade_counts.sort_values("Grade")
            
            fig_grades = px.bar(
                grade_counts, 
                x="Grade", 
                y="Count", 
                color="Grade",
                color_discrete_sequence=px.colors.qualitative.Plotly,
                text="Count",
                title="Number of Students per Grade"
            )
            fig_grades.update_layout(template="plotly_dark")
            st.plotly_chart(fig_grades, use_container_width=True)
            
        with col_chart2:
            st.subheader("Module-wise Comparison")
            # Calculate averages for module percentages
            mod_names = df_summary["Module Name"].tolist()
            mod_averages = df_summary["Average Percentage"].tolist()
            
            fig_modules = px.bar(
                x=mod_names,
                y=mod_averages,
                labels={"x": "Module Name", "y": "Average Percentage (%)"},
                color=mod_averages,
                color_continuous_scale="Viridis",
                title="Average Performance by Training Module"
            )
            fig_modules.update_layout(template="plotly_dark", coloraxis_showscale=False)
            st.plotly_chart(fig_modules, use_container_width=True)
            
        st.subheader("Detailed Module Summary Stats")
        st.dataframe(df_summary, use_container_width=True, hide_index=True)
        
    # Tab 3: Weak Students (Remedial Candidates)
    with tab_weak_students:
        st.subheader("Identified Remedial Candidates")
        st.markdown("""
        The following students have been flagged for special assistance or remedial training. 
        A student is flagged if:
        - Their cumulative percentage is **below 50%**, OR
        - They have a grade of **D** or **F**.
        """)
        
        df_weak = df_rankings[
            (df_rankings["Cumulative_Pct"] < 50.0) | 
            (df_rankings["Grade"].isin(["D", "F"]))
        ].copy()
        
        if df_weak.empty:
            st.success("🎉 No students meet the criteria for remedial intervention! Everyone is performing exceptionally.")
        else:
            display_weak_cols = ["Rank", "Name", "Email", "Cumulative_Pct", "Grade"]
            df_weak_display = df_weak[display_weak_cols]
            df_weak_display.columns = ["Current Rank", "Name", "Email Address", "Cumulative Percentage", "Assigned Grade"]
            
            st.dataframe(
                df_weak_display.style.format({
                    "Cumulative Percentage": "{:.2f}%"
                }).background_gradient(subset=["Cumulative Percentage"], cmap="Reds_r"),
                use_container_width=True,
                hide_index=True
            )
            
    # Tab 4: Student Lookup
    with tab_student_lookup:
        st.subheader("Search Student Profile")
        
        student_emails = df_master["Email"].tolist()
        selected_email = st.selectbox("Select student email address", student_emails)
        
        if selected_email:
            student_data = df_master[df_master["Email"] == selected_email].iloc[0]
            
            # Print Profile header
            col_prof1, col_prof2 = st.columns([2, 1])
            with col_prof1:
                st.markdown(f"### **{student_data['Name']}**")
                st.markdown(f"📧 `{student_data['Email']}`")
            with col_prof2:
                st.markdown(f"#### **Rank #{student_data['Rank']} &bull; Grade: {student_data['Grade']}**")
                
            st.markdown("---")
            
            # Machine Learning predictions (based on early quizzes)
            reg_model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'output', 'student_score_predictor.pkl'))
            clf_model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'output', 'student_grade_predictor.pkl'))
            
            if os.path.exists(reg_model_path) and os.path.exists(clf_model_path):
                try:
                    import joblib
                    reg_data = joblib.load(reg_model_path)
                    clf_data = joblib.load(clf_model_path)
                    
                    features_list = reg_data['features']
                    if all(f in student_data for f in features_list):
                        student_features = [student_data[f] for f in features_list]
                        pred_score = reg_data['model'].predict([student_features])[0]
                        pred_grade = clf_data['model'].predict([student_features])[0]
                        
                        col_pred1, col_pred2 = st.columns(2)
                        with col_pred1:
                            st.info(f"🔮 **ML Predicted Overall Score (based on early quizzes)**: **{pred_score:.1f}%**")
                        with col_pred2:
                            st.success(f"🔮 **ML Predicted Final Grade**: **{pred_grade}**")
                except Exception as e:
                    st.warning(f"Error executing ML predictions: {e}")
                    
            st.markdown("---")
            
            # Extract daily progression
            daily_scores = []
            for q in quizzes:
                if q in student_data:
                    # Get percentage score for the quiz
                    daily_scores.append({
                        "Quiz": q,
                        "Percentage": student_data[f"{q}_pct"],
                        "Marks": student_data[q]
                    })
            df_daily = pd.DataFrame(daily_scores)
            
            col_lkup1, col_lkup2 = st.columns(2)
            with col_lkup1:
                st.markdown("#### **Quiz Performance Progression**")
                fig_prog = px.line(
                    df_daily,
                    x="Quiz",
                    y="Percentage",
                    markers=True,
                    labels={"Quiz": "Daily Quiz Number", "Percentage": "Score (%)"},
                    title="Student Performance across the 25 Quizzes"
                )
                fig_prog.update_layout(template="plotly_dark", yaxis_range=[0, 105])
                st.plotly_chart(fig_prog, use_container_width=True)
                
            with col_lkup2:
                st.markdown("#### **Module Performance Breakdown**")
                
                module_names = [mod["name"] for mod in config.get("modules", [])]
                module_pcts = [student_data[f"{m}_pct"] for m in module_names]
                
                fig_radar = go.Figure(data=go.Scatterpolar(
                    r=module_pcts,
                    theta=module_names,
                    fill='toself',
                    line_color='#6366f1'
                ))
                fig_radar.update_layout(
                    polar=dict(
                        radialaxis=dict(visible=True, range=[0, 100])
                    ),
                    showlegend=False,
                    template="plotly_dark",
                    title="Module Percentages Overview"
                )
                st.plotly_chart(fig_radar, use_container_width=True)

if __name__ == "__main__":
    main()
