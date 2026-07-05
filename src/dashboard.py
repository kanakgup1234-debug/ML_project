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
        
    # ------------------ Highest / Lowest Scorer Highlights ------------------
    st.write("")
    highest_scorer = df_rankings.iloc[0]
    lowest_scorer = df_rankings.iloc[-1]
    
    col_high, col_low = st.columns(2)
    with col_high:
        st.markdown(f"""
        <div style="background-color: #1e293b; border-left: 5px solid #fbbf24; border-radius: 16px; padding: 1.25rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="font-size: 0.85rem; color: #fbbf24; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
                🏆 Program Highest Scorer
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                <div>
                    <div style="font-size: 1.2rem; font-weight: 700; color: #ffffff;">{highest_scorer['Name']}</div>
                    <div style="font-size: 0.85rem; color: #9ca3af; margin-top: 2px;">{highest_scorer['Email']}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.4rem; font-weight: 800; color: #fbbf24;">{highest_scorer['Cumulative_Pct']:.1f}%</div>
                    <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 2px;">Rank #{highest_scorer['Rank']} &bull; Grade {highest_scorer['Grade']}</div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
    with col_low:
        is_single = highest_scorer['Email'] == lowest_scorer['Email']
        st.markdown(f"""
        <div style="background-color: #1e293b; border-left: 5px solid #ef4444; border-radius: 16px; padding: 1.25rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="font-size: 0.85rem; color: #f87171; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
                📉 Program Lowest Scorer
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                <div>
                    <div style="font-size: 1.2rem; font-weight: 700; color: #ffffff;">{'N/A' if is_single else lowest_scorer['Name']}</div>
                    <div style="font-size: 0.85rem; color: #9ca3af; margin-top: 2px;">{'' if is_single else lowest_scorer['Email']}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.4rem; font-weight: 800; color: #ef4444;">{'N/A' if is_single else f"{lowest_scorer['Cumulative_Pct']:.1f}%"}</div>
                    <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 2px;">{'Only 1 Student Roster' if is_single else f"Rank #{lowest_scorer['Rank']} &bull; Grade {lowest_scorer['Grade']}"}</div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    st.write("")
    st.write("")
    
    # ------------------ Tabs for Sections ------------------
    tab_rankings, tab_analytics, tab_weak_students, tab_student_lookup, tab_upload = st.tabs([
        "🏆 Top Performers & Rankings", 
        "📊 Module & Grade Analytics", 
        "⚠️ Remedial Finder (Weak Students)", 
        "🔍 Individual Student Lookup",
        "⚙️ Pipeline Control & Upload"
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
                
                # Single email send button
                if st.button("✉️ Email Report Card", key=f"st_email_single_{student_data['Email']}"):
                    with st.spinner("Compiling and sending email..."):
                        try:
                            import processor, card_generator, emailer
                            df_students = processor.process_results()
                            if df_students is not None:
                                cards_dir = card_generator.generate_all_cards(df_students)
                                safe_email = str(student_data['Email']).strip().lower().replace('@', '_').replace('.', '_')
                                card_path = os.path.join(cards_dir, f"{safe_email}.html")
                                
                                success, msg = emailer.send_performance_email(
                                    student_data["Name"], 
                                    student_data["Email"], 
                                    card_path, 
                                    student_data["Cumulative_Pct"], 
                                    student_data["Grade"], 
                                    student_data["Rank"]
                                )
                                if success:
                                    st.success(f"Email processed successfully! {msg}")
                                else:
                                    st.error(f"Failed to send email: {msg}")
                            else:
                                st.error("No student data roster records found.")
                        except Exception as e:
                            st.error(f"Email dispatch error: {e}")
                
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

        # Tab 5: Pipeline & Upload
        with tab_upload:
            st.subheader("Quiz Response Uploader & Model Training Control")
            st.markdown("""
            Attach a quiz CSV file (containing **Email** and **Score** columns). The system will automatically:
            1. Save the quiz file to `quizzes/`
            2. Update the config metadata (if adding a new quiz)
            3. Recalculate student scores, rank standings, final grades, and regenerate all grade cards
            4. Retrain the machine learning Random Forest regression and classification prediction models
            """)
            st.write("")
            
            col_u1, col_u2 = st.columns(2)
            with col_u1:
                quiz_id = st.text_input("Quiz ID (e.g. day8_module3_quiz8)", key="st_quiz_id").strip().lower()
                is_new = st.checkbox("Is this a new quiz (not in current config)?", key="st_is_new")
            
            with col_u2:
                if is_new:
                    module_options = [m["name"] for m in config.get("modules", [])]
                    selected_mod = st.selectbox("Belongs to Module", module_options, key="st_mod")
                    max_marks = st.number_input("Maximum Quiz Marks", min_value=1, value=10, key="st_max_marks")
            
            uploaded_file = st.file_uploader("Choose a Quiz CSV file", type=["csv"], key="st_file_uploader")
            
            if uploaded_file is not None and quiz_id:
                st.write("")
                if st.button("Upload CSV & Execute Training Pipeline", key="st_upload_btn"):
                    with st.spinner("Processing results, retraining ML models, and generating grade cards..."):
                        try:
                            # 1. Save uploaded file to quizzes/
                            quizzes_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'quizzes'))
                            os.makedirs(quizzes_dir, exist_ok=True)
                            target_file_path = os.path.join(quizzes_dir, f"{quiz_id}.csv")
                            
                            string_data = uploaded_file.getvalue().decode("utf-8")
                            with open(target_file_path, "w", encoding="utf-8") as f:
                                f.write(string_data)
                                
                            st.info(f"Saved uploaded quiz file to `quizzes/{quiz_id}.csv`")
                            
                            # 2. Update config.json if new quiz
                            if is_new:
                                config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'config', 'config.json'))
                                import json
                                with open(config_path, "r", encoding="utf-8") as f:
                                    cfg_data = json.load(f)
                                
                                # Add to module quizzes list
                                for m in cfg_data.get("modules", []):
                                    if m["name"] == selected_mod:
                                        if quiz_id not in m["quizzes"]:
                                            m["quizzes"].append(quiz_id)
                                            st.info(f"Added {quiz_id} to module '{selected_mod}' in configuration.")
                                
                                # Set max marks
                                cfg_data["quiz_max_marks"] = cfg_data.get("quiz_max_marks", {})
                                cfg_data["quiz_max_marks"][quiz_id] = int(max_marks)
                                
                                with open(config_path, "w", encoding="utf-8") as f:
                                    json.dump(cfg_data, f, indent=2)
                            
                            # 3. Run Pipeline: processor.py
                            import processor
                            df_students = processor.process_results()
                            
                            if df_students is not None:
                                st.success("Successfully processed student results and updated master files!")
                                
                                # 4. Generate Cards: card_generator.py
                                import card_generator
                                card_generator.generate_all_cards(df_students)
                                st.success("Successfully generated personalized grade cards!")
                                
                                # 5. Train ML Models: train_model.py
                                import train_model
                                train_model.train_models()
                                st.success("Successfully retrained Machine Learning prediction models!")
                                
                                st.balloons()
                                st.success("🎉 Performance Management Pipeline Executed Successfully!")
                                st.rerun()
                            else:
                                st.error("Error: pipeline processed no data records.")
                                
                        except Exception as e:
                            st.error(f"Error executing pipeline: {e}")

            # Divider
            st.markdown("---")
            
            st.subheader("✉️ Email Dispatcher & Settings")
            st.markdown(f"Configure SMTP credentials and trigger bulk emails to all students from **{config.get('email_settings', {}).get('sender_email', 'kanak.gup1234@gmail.com')}**.")
            
            col_e1, col_e2 = st.columns(2)
            
            with col_e1:
                st.markdown("#### SMTP Configuration")
                email_settings = config.get("email_settings", {})
                
                # Fetch settings
                sender_val = st.text_input("Sender Email Address", value=email_settings.get("sender_email", "kanak.gup1234@gmail.com"), key="st_sender_email")
                password_val = st.text_input("Gmail App Password", placeholder="••••••••••••••••", type="password", key="st_sender_password")
                mock_mode_val = st.checkbox("Enable Mock Mode (Write emails to local files)", value=email_settings.get("mock_mode", True), key="st_mock_mode")
                
                if st.button("Save Email Settings", key="st_save_email_btn"):
                    config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'config', 'config.json'))
                    import json
                    with open(config_path, "r", encoding="utf-8") as f:
                        cfg_data = json.load(f)
                    
                    cfg_data["email_settings"] = cfg_data.get("email_settings", {})
                    cfg_data["email_settings"]["sender_email"] = sender_val.strip()
                    if password_val:
                        cfg_data["email_settings"]["sender_password"] = password_val
                    cfg_data["email_settings"]["mock_mode"] = mock_mode_val
                    
                    with open(config_path, "w", encoding="utf-8") as f:
                        json.dump(cfg_data, f, indent=2)
                        
                    st.success("Email configuration saved successfully!")
                    st.rerun()
            
            with col_e2:
                st.markdown("#### Dispatch Operations")
                st.markdown("Send personalized performance reports and grade card attachments to all students in the roster.")
                
                if st.button("Email All Performance Reports", key="st_email_all_btn"):
                    with st.spinner("Compiling reports and dispatching emails..."):
                        try:
                            import processor, card_generator, emailer
                            df_students = processor.process_results()
                            if df_students is not None:
                                cards_dir = card_generator.generate_all_cards(df_students)
                                success_count, errors = emailer.email_all_reports(df_students, cards_dir)
                                
                                st.success(f"Successfully processed and dispatched emails to {success_count} students!")
                                if errors:
                                    st.warning(f"Encountered {len(errors)} errors sending emails. Check logs for details.")
                            else:
                                st.error("No student records found to email.")
                        except Exception as e:
                            st.error(f"Email dispatch error: {e}")

if __name__ == "__main__":
    main()
